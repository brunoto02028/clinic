import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { signFileToken } from "@/lib/file-access-token";
import { porContaDeNoBearer } from "@/lib/sessao-emprestada";
import { STATUS_VISIVEIS, donosDasFaturas, faltaPagar, podeSerPaga } from "@/lib/patient-invoices";

export const dynamic = "force-dynamic";

/**
 * As faturas do paciente — as dele, e as de quem ele cuida.
 *
 * ## Sem gate de módulo, de propósito
 *
 * Toda rota `/api/patient/*` declara o `mod_*` que serve, e esta não declara
 * nenhum. Fatura não é assunto clínico: é o registro do que foi cobrado, e ele
 * não pode sumir porque a clínica desligou "documentos" ou porque o plano da
 * pessoa mudou. O `patientGate` continua valendo para sessão e consentimento —
 * o que sai é só o interruptor de módulo.
 */
export async function GET(req: NextRequest) {
  const gate = await patientGate();
  if (gate.response) return gate.response;

  const efetivo = await getEffectiveUser();
  if (!efetivo) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = efetivo.userId;

  const donos = await donosDasFaturas(userId);

  const faturas = await prisma.patientInvoice.findMany({
    where: { patientId: { in: donos }, status: { in: STATUS_VISIVEIS as any } },
    orderBy: { issueDate: "desc" },
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
      patientId: true,
      // O PDF **não** entra na lista: são centenas de KB por fatura, em base64,
      // e a lista abriria carregando todos. Ele vai pelo link assinado, um a um.
      pdfBase64: false,
      patient: { select: { firstName: true, lastName: true } },
      items: { select: { description: true, quantity: true, unitPrice: true, total: true } },
    },
  });

  /**
   * Comprar com a sessão emprestada continua recusado.
   *
   * Quem entra "por conta de" outra pessoa vê — e é para isso que a sessão
   * existe. Gastar dinheiro no lugar de alguém é outra coisa, e `lib/
   * sessao-emprestada.ts` já a recusa. Em vez de deixar o botão aparecer e
   * morrer em 403, a lista diz aqui que ele não vale, e a tela explica.
   */
  const emprestada = porContaDeNoBearer(req.headers.get("authorization")) !== null;

  const base = (process.env.NEXTAUTH_URL || "https://bpr.clinic").replace(/\/$/, "");

  /**
   * A chave publicável vai junto com a lista, e é de propósito.
   *
   * O PaymentSheet precisa dela **antes** de existir uma cobrança — é ela que
   * inicializa o SDK na tela. Buscá-la só na hora do toque obrigaria a tela a
   * inicializar o Stripe no meio do pagamento, que é o pior momento para
   * descobrir que falta configuração.
   *
   * Ela é pública por definição: o Stripe a publica dentro de todo app e de
   * toda página de checkout do mundo. O que nunca sai daqui é a secreta.
   *
   * Sem as duas chaves não há pagamento, e aí **nenhuma fatura é pagável** — o
   * botão não aparece em vez de aparecer e morrer em 503. É o estado de
   * produção hoje, enquanto a conta live da BPR não existe.
   */
  const pagamentoLigado = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PUBLISHABLE_KEY;

  return NextResponse.json({
    stripePublishableKey: pagamentoLigado ? process.env.STRIPE_PUBLISHABLE_KEY : null,
    invoices: faturas.map((f) => ({
      id: f.id,
      invoiceNumber: f.invoiceNumber,
      status: f.status,
      currency: f.currency,
      total: f.total,
      paidAmount: f.paidAmount,
      paidAt: f.paidAt,
      issueDate: f.issueDate,
      dueDate: f.dueDate,
      outstanding: faltaPagar(f),
      payable: pagamentoLigado && !emprestada && podeSerPaga(f),
      items: f.items,
      /**
       * De quem é a fatura, quando não é de quem está olhando.
       *
       * Uma lista com a fatura da mãe e a do filho misturadas, sem dizer de
       * quem é cada uma, é a mãe pagando duas vezes a mesma coisa.
       */
      de: f.patientId === userId ? null : `${f.patient.firstName} ${f.patient.lastName}`,
      /**
       * Link assinado, curto, que a folha do navegador abre sozinha — a mesma
       * mecânica dos documentos. O prefixo `invoice:` existe para que um token
       * de documento nunca abra uma fatura, nem o contrário.
       */
      openUrl: `${base}/api/patient/invoices/${f.id}/pdf?t=${signFileToken(`invoice:${f.id}`, userId)}`,
    })),
  });
}
