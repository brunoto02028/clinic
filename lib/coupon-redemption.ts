import { prisma } from "@/lib/db";
import {
  applyCoupon,
  normalizeCode,
  JANELA_RESERVA_MS,
  type CouponRejected,
  type CouponScope,
} from "@/lib/coupon";

export { JANELA_RESERVA_MS };

/**
 * O mínimo que a Stripe aceita cobrar, em libras.
 *
 * Um desconto que deixa o total em £0,20 faz a criação da sessão falhar com uma
 * mensagem deles que o paciente não deveria ler. Quem cobra checa isto **antes**
 * e recusa com frase nossa (A-2 do review, 26/09/2026).
 */
export const MINIMO_COBRAVEL = 0.3;

/** Frase única para o valor que sobrou pequeno demais para cobrar. */
export const ABAIXO_DO_MINIMO = {
  en: "That code leaves an amount too small to charge. Ask the clinic for a full courtesy instead.",
  pt: "Esse código deixa um valor pequeno demais para cobrar. Peça à clínica uma cortesia total.",
};

/**
 * O resgate do cupom no checkout (084, T-4).
 *
 * Esta é a tarefa que fecha o buraco entre *"a tela mostrou £80"* e *"o cartão
 * foi debitado em £80"*. Três regras, e todas as três nasceram de defeitos reais
 * deste código:
 *
 * 1. **O valor é recalculado aqui.** A prévia da T-3 não autoriza nada: ela é
 *    uma tela. Cobrar o que o app mandou seria aceitar o preço do cliente, que
 *    é a mesma família da N4 da 080 pelo avesso.
 * 2. **Reservar antes de cobrar, e soltar se a cobrança não nascer.** Um resgate
 *    sem Checkout consome limite de graça.
 * 3. **Dois toques são um resgate.** `find-then-write` sobre a reserva em
 *    aberto, como o resto deste código desde a F2 da 080.
 *
 * Quem confirma é o webhook, nunca esta função — do mesmo jeito que a consulta
 * só vira confirmada quando a Stripe diz que o dinheiro entrou.
 */

export interface Reserva {
  redemptionId: string;
  couponId: string;
  code: string;
  original: number;
  discount: number;
  final: number;
  /** Como o desconto foi calculado — a assinatura precisa saber (ver `cupomStripe`). */
  percent: number | null;
  currency: string;
}

export type ResultadoReserva =
  /** Ninguém digitou código: cobra-se o preço cheio. */
  | { tipo: "sem_cupom" }
  /** O código veio, mas não vale. Quem chama devolve a frase ao paciente. */
  | { tipo: "recusado"; recusa: CouponRejected }
  | { tipo: "reservado"; reserva: Reserva };

/**
 * Reserva o cupom e devolve o valor a cobrar.
 *
 * Sem `code`, responde `sem_cupom` sem tocar no banco — é o caminho de quase
 * todo mundo, e não pode custar uma consulta a mais.
 */
export async function reservarCupom(args: {
  clinicId: string;
  patientId: string;
  code?: string | null;
  scope: CouponScope;
  amount: number;
  currency: string;
  /**
   * **Qual compra.** O id da consulta, do pacote, do plano ou da assinatura.
   *
   * É o que separa *dois toques na mesma compra* — que reaproveitam a reserva —
   * de *duas compras diferentes do mesmo tipo*, que são duas reservas e a
   * segunda bate no limite. Sem ele, um cupom de um uso por paciente pagava
   * duas consultas descontadas e registrava um resgate só (R-1 do reteste).
   */
  targetId?: string | null;
  /**
   * O cliente da Stripe, quando quem chama tem um. Serve para **expirar** a
   * sessão anterior ao reaproveitar a reserva: sem isso a sessão antiga segue
   * paga­vel com o desconto por 24h, e a pessoa pode pagar as duas.
   */
  stripe?: { checkout: { sessions: { expire: Function } } } | null;
}): Promise<ResultadoReserva> {
  const code = normalizeCode(args.code);
  if (!code) return { tipo: "sem_cupom" };

  /**
   * A reserva a reaproveitar é achada **antes** de resolver o cupom.
   *
   * A ordem importa: é ela que sai da contagem do limite, e só ela. Resolver
   * primeiro e reaproveitar depois fazia a contagem ver a própria reserva do
   * paciente e recusar o segundo toque dele (A-1); excluir "as reservas dele"
   * em bloco fazia o contrário — dois escopos, nenhum contando, dois pagamentos
   * (N-1). Uma linha entra, uma linha sai.
   *
   * O `code` normalizado basta para achá-la: a chave do cupom é
   * `(clinicId, code)`.
   */
  const emAberto = await prisma.couponRedemption.findFirst({
    where: {
      coupon: { clinicId: args.clinicId, code },
      patientId: args.patientId,
      scope: args.scope,
      // A compra entra na chave. `targetId: null` só casa com `null`, então um
      // caminho sem id próprio não reaproveita a reserva de outro.
      targetId: args.targetId ?? null,
      confirmedAt: null,
      createdAt: { gte: new Date(Date.now() - JANELA_RESERVA_MS) },
    },
    orderBy: { createdAt: "desc" },
  });

  const r = await applyCoupon({
    clinicId: args.clinicId,
    patientId: args.patientId,
    code,
    scope: args.scope,
    amount: args.amount,
    currency: args.currency,
    ignorarResgateId: emAberto?.id,
  });
  if (!r.ok) return { tipo: "recusado", recusa: r };

  // A sessão anterior desta mesma compra é expirada na Stripe antes de a nova
  // nascer. "Morreu com o toque anterior" era suposição minha: ela seguia
  // pagável com o desconto por 24h (R-1 do reteste). Melhor esforço — se a
  // Stripe recusar (já expirada, já paga), a nova reserva segue.
  if (emAberto?.stripeSessionId && args.stripe) {
    try {
      await args.stripe.checkout.sessions.expire(emAberto.stripeSessionId);
    } catch (e: any) {
      console.error("[coupon] não foi possível expirar a sessão anterior", emAberto.stripeSessionId, e?.message);
    }
  }

  const linha = emAberto
    ? await prisma.couponRedemption.update({
        where: { id: emAberto.id },
        data: {
          originalAmount: r.original,
          discountAmount: r.discount,
          finalAmount: r.final,
          // A nova sessão entra quando nascer. Deixar a antiga aqui faria o
          // webhook dela confirmar esta.
          stripeSessionId: null,
        },
      })
    : await prisma.couponRedemption.create({
        data: {
          couponId: r.couponId,
          patientId: args.patientId,
          scope: args.scope,
          targetId: args.targetId ?? null,
          originalAmount: r.original,
          discountAmount: r.discount,
          finalAmount: r.final,
        },
      });

  return {
    tipo: "reservado",
    reserva: {
      redemptionId: linha.id,
      couponId: r.couponId,
      code: r.code,
      original: r.original,
      discount: r.discount,
      final: r.final,
      percent: r.percent,
      currency: r.currency,
    },
  };
}

/**
 * O cupom da Stripe que aplica este desconto numa **assinatura**.
 *
 * Numa cobrança única basta mandar o `unit_amount` já descontado. A assinatura
 * não: ela usa um `price` fixo do catálogo da Stripe, e o desconto só entra como
 * `discounts: [{ coupon }]`.
 *
 * O id é **determinístico** de propósito. Criar um cupom por adesão encheria a
 * conta da Stripe de objetos descartáveis; assim existe no máximo um por código
 * e valor, e a segunda adesão reaproveita o primeiro. `duration: "once"` porque
 * o desconto vale na adesão, não em toda mensalidade — é a suposição 7 do plano.
 */
export async function cupomStripe(
  stripe: { coupons: { retrieve: Function; create: Function } },
  reserva: Reserva
): Promise<string> {
  const id =
    reserva.percent !== null
      ? `bpr-pct-${reserva.code}-${reserva.percent}`
      : `bpr-amt-${reserva.code}-${Math.round(reserva.discount * 100)}-${reserva.currency.toLowerCase()}`;

  try {
    await stripe.coupons.retrieve(id);
    return id;
  } catch {
    // Não existe ainda. Uma corrida entre duas adesões simultâneas faz a segunda
    // falhar com "already exists", e aí o id é o mesmo de qualquer forma.
    try {
      await stripe.coupons.create({
        id,
        name: `${reserva.code}`,
        duration: "once",
        ...(reserva.percent !== null
          ? { percent_off: reserva.percent }
          : { amount_off: Math.round(reserva.discount * 100), currency: reserva.currency.toLowerCase() }),
      });
    } catch (e: any) {
      if (!String(e?.message ?? "").includes("already exists")) throw e;
    }
    return id;
  }
}

/** A sessão nasceu: é por ela que o webhook vai achar este resgate. */
export async function anexarSessao(redemptionId: string, stripeSessionId: string) {
  await prisma.couponRedemption.update({
    where: { id: redemptionId },
    data: { stripeSessionId },
  });
}

/**
 * A cobrança não nasceu — solta a vaga.
 *
 * Nunca lança: esta função é chamada de dentro de um `catch`, e uma exceção
 * aqui trocaria "não foi possível iniciar o pagamento" por um 500 sem sentido.
 */
export async function liberarReserva(redemptionId: string) {
  try {
    await prisma.couponRedemption.delete({ where: { id: redemptionId } });
  } catch (e: any) {
    console.error("[coupon] não foi possível liberar a reserva", redemptionId, e?.message);
  }
}

/**
 * Cortesia de 100%: não há Checkout, então não há webhook para confirmar.
 *
 * Sem isto um cupom que zera o preço ficaria eternamente "reservado" e nunca
 * contaria para o limite — uma campanha de uso único poderia ser usada por
 * todos, uma hora depois da outra.
 */
export async function confirmarSemCobranca(redemptionId: string) {
  await prisma.couponRedemption.update({
    where: { id: redemptionId },
    data: { confirmedAt: new Date() },
  });
}

/**
 * O dinheiro entrou (webhook).
 *
 * `updateMany` com `confirmedAt: null` no `where` é o que torna o evento
 * repetido inofensivo: a Stripe reenvia, e a segunda vez não acha nada para
 * mudar — o mesmo padrão da confirmação da consulta (atividade 080).
 */
export async function confirmarPorSessao(stripeSessionId: string): Promise<number> {
  const r = await prisma.couponRedemption.updateMany({
    where: { stripeSessionId, confirmedAt: null },
    data: { confirmedAt: new Date() },
  });

  /**
   * A conferência final do limite.
   *
   * A reserva é otimista: ela olha o limite no instante em que o Checkout abre.
   * Aqui o dinheiro já entrou, então **não** desfazemos nada — desfazer um
   * resgate cobrado apagaria a explicação de por que aquela pessoa pagou menos.
   * O que fazemos é gritar, porque uma campanha que passou do limite é dinheiro
   * a mais dado e alguém tem de saber (N-1 do review, 26/09/2026).
   */
  if (r.count > 0) {
    const linha = await prisma.couponRedemption.findFirst({
      where: { stripeSessionId },
      select: { couponId: true, coupon: { select: { code: true, maxRedemptions: true } } },
    });
    if (linha?.coupon?.maxRedemptions != null) {
      const confirmados = await prisma.couponRedemption.count({
        where: { couponId: linha.couponId, confirmedAt: { not: null } },
      });
      if (confirmados > linha.coupon.maxRedemptions) {
        console.error(
          `[coupon] LIMITE ESTOURADO: ${linha.coupon.code} tem ${confirmados} resgates confirmados ` +
            `para um limite de ${linha.coupon.maxRedemptions} (sessão ${stripeSessionId}). ` +
            `O dinheiro já entrou; o resgate fica registrado.`
        );
      }
    }
  }

  return r.count;
}

/**
 * A sessão expirou ou foi cancelada: a vaga volta antes da janela.
 *
 * Só apaga o que ainda não foi confirmado — um pagamento que entrou e um evento
 * de expiração que chega depois não podem apagar o resgate cobrado.
 */
export async function descartarPorSessao(stripeSessionId: string): Promise<number> {
  const r = await prisma.couponRedemption.deleteMany({
    where: { stripeSessionId, confirmedAt: null },
  });
  return r.count;
}
