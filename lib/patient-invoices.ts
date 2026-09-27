import { prisma } from "@/lib/db";

/**
 * As faturas, do lado de quem as recebe.
 *
 * ## O buraco
 *
 * A clínica emite, numera, gera o PDF com o logo da BPR e manda por e-mail
 * depois que alguém aprova. E o paciente **não tinha onde ver**: nem no app,
 * nem na web (`/dashboard/billing` é a cobrança do aluno do personal, outra
 * frente). Quem apagasse o e-mail perdia a fatura.
 *
 * Como o app é o único alvo do paciente depois do lançamento, "só por e-mail"
 * é o mesmo que "não tem".
 */

/**
 * O que o paciente pode ver.
 *
 * `DRAFT` fica de fora, e esta é a regra que mais importa aqui: rascunho está
 * na fila de aprovação e **ninguém aprovou ainda**. Mostrá-lo seria a fatura
 * chegando ao paciente sem o passo que existe justamente para que nada
 * financeiro saia sozinho.
 *
 * `VOID` também não: é fatura cancelada. Quem já tinha recebido a original por
 * e-mail continua com ela; o que a clínica não quer é a pessoa pagando algo
 * que foi anulado.
 */
export const STATUS_VISIVEIS = ["SENT", "PAID", "OVERDUE", "PARTIALLY_PAID"] as const;

/** Quanto ainda falta pagar — o total menos o que já entrou. */
export function faltaPagar(inv: { total: number; paidAmount: number | null }): number {
  // Arredonda para centavos: `172.8 - 100.3` em ponto flutuante vira
  // `72.49999999999999`, e isso viraria `7249` pence na cobrança.
  return Math.round((inv.total - (inv.paidAmount ?? 0)) * 100) / 100;
}

/**
 * Dá para pagar esta fatura agora?
 *
 * O mínimo de 30 pence é da Stripe, não nosso: abaixo disso a criação da
 * cobrança falha com uma mensagem em inglês que o paciente não deveria ler. Uma
 * fatura de 20 pence existe (resto de um pagamento parcial), e a resposta certa
 * é a clínica perdoar o troco, não o app mostrar um botão que quebra.
 */
export function podeSerPaga(inv: {
  status: string;
  total: number;
  paidAmount: number | null;
}): boolean {
  if (!["SENT", "OVERDUE", "PARTIALLY_PAID"].includes(inv.status)) return false;
  return faltaPagar(inv) >= 0.3;
}

/**
 * De quem são as faturas que esta pessoa pode ver: as dela, e as de quem ela
 * cuida.
 *
 * A fatura de uma criança sai **no nome da criança** — é dela o atendimento —
 * e quem paga é quem responde por ela, que é o que os termos 1.3 dizem. Sem
 * isto, a fatura do filho não apareceria para ninguém: o filho não faz login.
 *
 * Note que isto não é a sessão emprestada. Ali quem age é a criança, e
 * comprar em nome de outro continua recusado de propósito. Aqui a mãe está na
 * **conta dela**, vendo e pagando o que lhe cabe pagar.
 */
export async function donosDasFaturas(userId: string): Promise<string[]> {
  const geridos = await prisma.user.findMany({
    where: { managedById: userId, deletedAt: null },
    select: { id: true },
  });
  return [userId, ...geridos.map((g) => g.id)];
}

/**
 * Esta fatura é desta pessoa, ou de alguém que ela cuida?
 *
 * Devolve a fatura quando sim, `null` quando não — e o chamador responde 404,
 * nunca 403: dizer "existe, mas não é sua" conta a um estranho que a fatura
 * existe, e com ela o número, que é sequencial por clínica.
 */
export async function faturaQuePossoVer(id: string, userId: string) {
  const inv = await prisma.patientInvoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      currency: true,
      total: true,
      paidAmount: true,
      paidAt: true,
      issueDate: true,
      dueDate: true,
      notes: true,
      clinicId: true,
      patientId: true,
      pdfBase64: false,
      patient: { select: { firstName: true, lastName: true, managedById: true } },
      items: { select: { description: true, quantity: true, unitPrice: true, total: true } },
    },
  });

  if (!inv) return null;
  if (!STATUS_VISIVEIS.includes(inv.status as any)) return null;
  if (inv.patientId !== userId && inv.patient.managedById !== userId) return null;
  return inv;
}

/**
 * O dinheiro entrou pelo app: a fatura vira paga.
 *
 * ## Por que aqui, e não no botão
 *
 * O botão só abre a folha de pagamento. Quem diz que o dinheiro entrou é a
 * Stripe, pelo webhook — marcar antes seria dar por paga a fatura de quem
 * fechou o app no meio. É a mesma regra da consulta, que só é confirmada
 * quando `checkout.session.completed` chega.
 *
 * ## O reenvio não pode contar duas vezes
 *
 * A Stripe reenvia webhook, e reenviar não pode virar duas entradas no
 * financeiro. Três coisas seguram isso: a linha é travada (`FOR UPDATE`), o
 * estado é relido **de dentro** da transação, e `financialEntryId` é único por
 * fatura. É o mesmo cuidado que o "marcar como paga" do painel tomou depois de
 * um review achar a corrida entre dois cliques.
 *
 * Devolve o que aconteceu, para o log do webhook dizer a verdade: `"pago"` na
 * primeira vez, `"ja_tratado"` no reenvio, `"sumiu"` quando a fatura não existe
 * mais.
 */
export async function pagarFaturaComStripe(args: {
  invoiceId: string;
  amount: number;
  paidAt: Date;
  stripePaymentIntentId: string;
}): Promise<"pago" | "ja_tratado" | "sumiu"> {
  const { createFinancialEntryForInvoice } = await import("@/lib/create-financial-entry-for-invoice");

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PatientInvoice" WHERE id = ${args.invoiceId} FOR UPDATE`;

      const f = await tx.patientInvoice.findUnique({
        where: { id: args.invoiceId },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          currency: true,
          total: true,
          paidAmount: true,
          clinicId: true,
          patientId: true,
          appointmentId: true,
          patientSubscriptionId: true,
          financialEntryId: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      });

      if (!f) return "sumiu" as const;
      // PAID e VOID são finais; DRAFT nunca chegou ao paciente. Qualquer um
      // deles aqui é reenvio, ou uma fatura que mudou embaixo do pagamento.
      if (!["SENT", "OVERDUE", "PARTIALLY_PAID"].includes(f.status)) return "ja_tratado" as const;
      if (f.financialEntryId) return "ja_tratado" as const;

      // Um pagamento parcial anterior continua contando: quem já tinha pago
      // metade e paga o resto termina com o total, não com a metade de agora.
      const jaPago = f.paidAmount ?? 0;
      const total = Math.round((jaPago + args.amount) * 100) / 100;

      await tx.patientInvoice.update({
        where: { id: f.id },
        data: {
          status: total + 0.001 >= f.total ? "PAID" : "PARTIALLY_PAID",
          paidAt: args.paidAt,
          paidAmount: total,
          // "stripe" em minúsculas na fatura e "STRIPE" no financeiro: é a
          // convenção que `lib/create-patient-invoice.ts` já usa, e o painel
          // lê `paidMethod === "stripe"` para recusar o "marcar como paga".
          paidMethod: "stripe",
        },
      });

      await createFinancialEntryForInvoice({
        db: tx,
        clinicId: f.clinicId,
        patientId: f.patientId,
        patientName: `${f.patient.firstName} ${f.patient.lastName}`,
        invoiceId: f.id,
        invoiceNumber: f.invoiceNumber,
        // O que entrou agora, não o total da fatura: um pagamento parcial que
        // lançasse o total inflaria a receita do dia.
        amount: args.amount,
        currency: f.currency,
        paidAt: args.paidAt,
        paymentMethod: "STRIPE",
        stripePaymentIntentId: args.stripePaymentIntentId,
        appointmentId: f.appointmentId,
        patientSubscriptionId: f.patientSubscriptionId,
      });

      return "pago" as const;
    });
  } catch (e: any) {
    // `financialEntryId` é único: o reenvio que escapar da releitura acima bate
    // aqui, e bater aqui é o resultado certo — não contou duas vezes.
    if (e?.code === "P2002") return "ja_tratado";
    throw e;
  }
}
