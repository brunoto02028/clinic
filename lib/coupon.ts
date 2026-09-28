import { prisma } from "@/lib/db";

/**
 * Quanto tempo uma reserva não confirmada ainda ocupa a vaga.
 *
 * **24h, porque é quanto vive uma sessão de Checkout do Stripe.** Uma hora era
 * um número escolhido por conforto e abria um buraco de 23h: o paciente
 * reservava, esperava a janela passar, reservava de novo com a sessão antiga
 * ainda válida, e pagava as duas — dois resgates confirmados num cupom de uso
 * único (N-1 do review das correções, provado em execução em 26/09/2026).
 *
 * Aba fechada não prende a campanha por um dia inteiro: o webhook
 * `checkout.session.expired` solta a reserva assim que o Stripe desiste dela.
 * Quem define o prazo é quem cobra, não nós.
 *
 * Vive aqui, e não em `coupon-redemption.ts`, porque é a **contagem** do limite
 * que depende dela — e a contagem é desta função. Reexportado de lá para quem
 * reserva ler o mesmo número.
 */
export const JANELA_RESERVA_MS = 24 * 60 * 60 * 1000;

/**
 * O cupom de desconto (084, T-1).
 *
 * Uma pergunta, uma resposta, um lugar. Há **dez** rotas criando Checkout neste
 * código; um cupom costurado em cada uma seriam nove chances de esquecer, e a
 * esquecida cobraria o preço cheio de quem tinha o código. Então a regra mora
 * aqui e quem cobra usa o que sai daqui — do mesmo jeito que
 * `servicePricesForPatient` (082) é a única resposta a "quanto custa".
 *
 * A recusa nunca é genérica. Cada motivo tem a sua frase, em inglês e em
 * português, porque a F2 do QA da 082 foi exatamente uma recusa dizendo a coisa
 * errada: quem não tinha preço configurado era informado de que a conta não
 * estava ligada a uma clínica, e ia procurar ajuda no lugar errado.
 *
 * **Exame de laboratório não aparece aqui** porque não existe em `CouponScope`
 * (decisão do Bruno, 26/09/2026). Nós revendemos o exame — o desconto sairia da
 * nossa margem, não do custo da LML. Uma rota que não chama `applyCoupon`
 * simplesmente cobra cheio.
 */

export type CouponScope =
  | "CONSULTATION"
  | "TREATMENT_SESSION"
  | "PACKAGE"
  | "TREATMENT_PLAN"
  | "MEMBERSHIP";

export type CouponRefusal =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "wrong_scope"
  | "not_for_you"
  | "limit_reached"
  | "already_used"
  /**
   * O cupom estava certo; o **valor** não. Motivo próprio porque dizer
   * "não vale para esta compra" com o código válido manda a pessoa procurar
   * outro código — é a forma exata da F2 da 082 (achado F1 do QA da T-1).
   * Um valor negativo ou não-numérico é bug de quem chamou, então quem recebe
   * isto registra, em vez de repassar como se fosse escolha do paciente.
   */
  | "invalid_amount"
  /**
   * Cupom de £15 sobre um preço em outra moeda descontaria 15 daquela moeda
   * (achado F3 do QA da T-1). Hoje tudo é GBP, então este caminho não
   * acontece — existe para que **não** aconteça em silêncio no dia em que uma
   * segunda moeda entrar.
   */
  | "wrong_currency";

export interface Bilingue {
  en: string;
  pt: string;
}

/**
 * As frases da recusa.
 *
 * `not_found` cobre três casos de propósito: código que não existe, código de
 * outra clínica e código apagado. Dizer "este cupom existe, mas não é seu"
 * transforma a tela num verificador de cupons alheios.
 */
const MOTIVOS: Record<CouponRefusal, Bilingue> = {
  not_found: {
    en: "We do not recognise that code.",
    pt: "Não reconhecemos esse código.",
  },
  inactive: {
    en: "That code is no longer being accepted.",
    pt: "Esse código não está mais sendo aceito.",
  },
  not_started: {
    en: "That code is not valid yet.",
    pt: "Esse código ainda não é válido.",
  },
  expired: {
    en: "That code has expired.",
    pt: "Esse código expirou.",
  },
  wrong_scope: {
    en: "That code does not apply to this purchase.",
    pt: "Esse código não vale para esta compra.",
  },
  not_for_you: {
    en: "That code was issued for another patient.",
    pt: "Esse código foi emitido para outro paciente.",
  },
  limit_reached: {
    en: "That code has reached its limit.",
    pt: "Esse código atingiu o limite de usos.",
  },
  already_used: {
    en: "You have already used that code.",
    pt: "Você já usou esse código.",
  },
  invalid_amount: {
    en: "We could not work out the price for this. Please try again.",
    pt: "Não foi possível calcular o preço disto. Tente de novo.",
  },
  wrong_currency: {
    en: "That code is issued in another currency.",
    pt: "Esse código foi emitido em outra moeda.",
  },
};

export interface CouponMatch {
  ok: true;
  couponId: string;
  code: string;
  /** O nome da campanha, para a tela. Um desconto sem nome parece erro de cálculo. */
  name: string | null;
  discountPercent: number | null;
  discountAmount: number | null;
  currency: string;
}

export interface CouponRejected {
  ok: false;
  reason: CouponRefusal;
  message: string;
  messagePt: string;
}

export type CouponResult = CouponMatch | CouponRejected;

function recusar(reason: CouponRefusal): CouponRejected {
  const m = MOTIVOS[reason];
  return { ok: false, reason, message: m.en, messagePt: m.pt };
}

/**
 * A data que a clínica digitou, entendida como a clínica entende.
 *
 * `new Date("2026-09-30")` é 00:00Z — então um cupom "até 30/09" já estava
 * expirado durante todo o dia 30, e a campanha morria um dia antes do combinado
 * (achado do review da 084). O fim de uma janela é o fim do dia; o início é o
 * começo dele. Devolve `null` para entrada que não é data, para quem chama
 * recusar com frase em vez de estourar no banco.
 */
export function limiteDoDia(valor: unknown, borda: "inicio" | "fim"): Date | null {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor !== "string" || !valor.trim()) return null;
  const texto = valor.trim();
  const soData = /^\d{4}-\d{2}-\d{2}$/.test(texto);
  const d = new Date(soData ? `${texto}T${borda === "fim" ? "23:59:59.999" : "00:00:00.000"}Z` : texto);
  if (Number.isNaN(d.getTime())) return null;
  /**
   * `new Date("2026-02-30")` não falha: rola para 2 de março. Uma campanha
   * terminava dois dias depois do que a clínica pediu, e pela API isso passava
   * com 200 (R-3 do reteste). Se o dia voltou diferente, a data não existe.
   */
  if (soData) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    if (d.getUTCFullYear() !== ano || d.getUTCMonth() + 1 !== mes || d.getUTCDate() !== dia) {
      return null;
    }
  }
  return d;
}

/** Maiúsculas e sem espaço nas pontas: `  verao10 ` e `VERAO10` são o mesmo cupom. */
export function normalizeCode(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase() : "";
}

interface ResolveArgs {
  clinicId: string;
  patientId: string;
  code: string;
  scope: CouponScope;
  /** Só para teste: o "agora" usado na janela de validade. */
  now?: Date;
  /**
   * A reserva em aberto que **esta** chamada vai reaproveitar.
   *
   * Só ela sai da contagem. Excluir todas as reservas em aberto do paciente —
   * como esta função fazia entre as duas correções de 26/09 — deixava a mesma
   * pessoa reservar em dois escopos (consulta e assinatura), nenhum dos dois
   * contar, e pagar os dois: dois resgates num cupom de uso único (N-1).
   */
  ignorarResgateId?: string;
}

/**
 * O cupom vale para esta pessoa, nesta compra, agora?
 *
 * A ordem das verificações é a ordem em que elas ajudam quem digitou: existe →
 * está ligado → está na janela → serve para isto → é seu → ainda tem.
 */
export async function resolveCoupon({
  clinicId,
  patientId,
  code,
  scope,
  now = new Date(),
  ignorarResgateId,
}: ResolveArgs): Promise<CouponResult> {
  const normalizado = normalizeCode(code);
  if (!normalizado) return recusar("not_found");

  // Tenant na consulta, sempre. Um cupom de outra clínica responde como
  // inexistente — foi assim que as notas SOAP vazaram (1b4109a5).
  const cupom = await prisma.coupon.findUnique({
    where: { clinicId_code: { clinicId, code: normalizado } },
  });
  if (!cupom) return recusar("not_found");
  if (!cupom.isActive) return recusar("inactive");
  if (cupom.startsAt && cupom.startsAt > now) return recusar("not_started");
  if (cupom.endsAt && cupom.endsAt < now) return recusar("expired");
  if (!cupom.appliesTo.includes(scope as never)) return recusar("wrong_scope");
  if (cupom.patientId && cupom.patientId !== patientId) return recusar("not_for_you");

  /**
   * O que consome limite: resgate **confirmado**, ou reserva **em andamento**.
   *
   * Contar só o confirmado (como esta função fazia) deixava passar uma corrida
   * real: dois pacientes abrem o Checkout do mesmo cupom de uso único, os dois
   * pagam, e a campanha vende duas vezes (T-4). Contar tudo faria o contrário —
   * uma aba fechada prenderia a campanha para sempre.
   *
   * Então quem está pagando **agora** ocupa a vaga, e quem abandonou a devolve
   * quando a janela passa.
   */
  const desde = new Date(now.getTime() - JANELA_RESERVA_MS);
  // Só a reserva que vai ser reaproveitada sai da conta — nunca "as reservas
  // dele", que é um conjunto e não uma linha.
  const foraDaConta = ignorarResgateId ? { id: { not: ignorarResgateId } } : {};
  const [doPaciente, total] = await Promise.all([
    /**
     * O limite **da pessoa** conta só o que ela já pagou.
     *
     * Contar a reserva dela aqui era um bug meu: com o `maxPerPatient: 1` que é
     * o padrão do modelo, o segundo pedido de pagamento do **mesmo** paciente
     * morria em `already_used` antes de chegar ao reaproveitamento da reserva —
     * então quem fechava a folha do Stripe e voltava em menos de uma hora lia
     * "você já usou esse código" e pagava o preço cheio (A-1 do review e do QA
     * da T-4, 26/09/2026).
     *
     * Ela não precisa disto para ficar protegida: `reservarCupom` reaproveita a
     * reserva em aberto dela, então uma pessoa nunca acumula duas linhas para a
     * mesma compra.
     */
    prisma.couponRedemption.count({
      where: {
        couponId: cupom.id,
        patientId,
        OR: [{ confirmedAt: { not: null } }, { createdAt: { gte: desde } }],
        ...foraDaConta,
      },
    }),
    /**
     * O limite **da campanha** conta o pago mais quem está pagando agora — é o
     * que impede dois pacientes diferentes usarem o mesmo cupom de uso único ao
     * mesmo tempo. A reserva em aberto **deste** paciente fica de fora pelo
     * mesmo motivo de cima: ela vai ser reaproveitada, não somada.
     */
    cupom.maxRedemptions === null
      ? Promise.resolve(0)
      : prisma.couponRedemption.count({
          where: {
            couponId: cupom.id,
            OR: [{ confirmedAt: { not: null } }, { createdAt: { gte: desde } }],
            ...foraDaConta,
          },
        }),
  ]);
  if (doPaciente >= cupom.maxPerPatient) return recusar("already_used");
  if (cupom.maxRedemptions !== null && total >= cupom.maxRedemptions) {
    return recusar("limit_reached");
  }

  return {
    ok: true,
    couponId: cupom.id,
    code: cupom.code,
    name: cupom.description,
    discountPercent: cupom.discountPercent,
    discountAmount: cupom.discountAmount,
    currency: cupom.currency,
  };
}

export interface CouponApplied {
  ok: true;
  couponId: string;
  code: string;
  name: string | null;
  currency: string;
  original: number;
  discount: number;
  final: number;
  /**
   * Percentual, quando foi assim que o desconto saiu; `null` quando foi valor
   * fixo. A assinatura precisa da distinção: ela aplica o desconto por um cupom
   * da Stripe, e `percent_off` e `amount_off` são campos diferentes.
   */
  percent: number | null;
}

export type ApplyResult = CouponApplied | CouponRejected;

/**
 * Quanto a pessoa paga com este cupom.
 *
 * O desconto nunca passa do valor: um cupom de £30 sobre uma consulta de £20
 * zera a consulta, não devolve £10. E o resultado é arredondado a centavos uma
 * única vez, aqui, porque dois arredondamentos em lugares diferentes são a tela
 * mostrando £79,99 e o cartão sendo debitado em £80,00.
 */
export async function applyCoupon(
  args: ResolveArgs & { amount: number; currency?: string }
): Promise<ApplyResult> {
  const { amount, currency } = args;
  if (!Number.isFinite(amount) || amount < 0) {
    // Nunca é entrada de paciente: um preço negativo vem de quem chamou.
    console.error("[coupon] applyCoupon recebeu um valor inválido:", amount);
    return recusar("invalid_amount");
  }

  const achado = await resolveCoupon(args);
  if (!achado.ok) return achado;

  // Só o valor fixo carrega moeda. Percentual é proporção, e 20% de qualquer
  // coisa são 20% daquela coisa.
  if (achado.discountAmount !== null && currency && currency !== achado.currency) {
    return recusar("wrong_currency");
  }

  const bruto =
    achado.discountPercent !== null
      ? (amount * achado.discountPercent) / 100
      : achado.discountAmount ?? 0;

  const discount = Math.min(Math.round(bruto * 100) / 100, amount);
  const final = Math.round((amount - discount) * 100) / 100;

  return {
    ok: true,
    couponId: achado.couponId,
    code: achado.code,
    name: achado.name,
    currency: achado.currency,
    original: amount,
    discount,
    final,
    percent: achado.discountPercent,
  };
}

/**
 * O cupom está bem formado?
 *
 * Vive aqui e não só na rota porque a tela de criação e a de edição fazem a
 * mesma pergunta, e duas cópias divergem. "Exatamente um dos dois descontos"
 * não é algo que o banco saiba exigir.
 */
/** As moedas que a plataforma cobra hoje. */
const MOEDAS = ["GBP", "EUR", "USD", "BRL"];

export function validateCouponInput(input: {
  code?: unknown;
  currency?: unknown;
  discountPercent?: unknown;
  discountAmount?: unknown;
  appliesTo?: unknown;
  maxPerPatient?: unknown;
  maxRedemptions?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
}): Bilingue | null {
  const code = normalizeCode(input.code);
  if (code.length < 3) {
    return { en: "A code needs at least 3 characters.", pt: "O código precisa de ao menos 3 caracteres." };
  }
  if (!/^[A-Z0-9-]+$/.test(code)) {
    return {
      en: "Use letters, numbers and hyphens only — a code gets typed by hand.",
      pt: "Use só letras, números e hífen — o código é digitado à mão.",
    };
  }

  const pct = input.discountPercent;
  const amt = input.discountAmount;
  const temPct = pct !== null && pct !== undefined && pct !== "";
  const temAmt = amt !== null && amt !== undefined && amt !== "";
  if (temPct === temAmt) {
    return {
      en: "Set either a percentage or a fixed amount, not both.",
      pt: "Defina ou um percentual ou um valor fixo, não os dois.",
    };
  }
  if (temPct) {
    const n = Number(pct);
    // 100% é válido: é cortesia com código. Acima de 100 não é desconto.
    if (!Number.isFinite(n) || n <= 0 || n > 100) {
      return { en: "A percentage goes from 1 to 100.", pt: "O percentual vai de 1 a 100." };
    }
  } else {
    const n = Number(amt);
    if (!Number.isFinite(n) || n <= 0) {
      return { en: "A fixed amount must be more than zero.", pt: "O valor fixo tem de ser maior que zero." };
    }
  }

  // Moeda inventada era aceita, e o cupom nascia inutilizável: a resolução
  // depois recusava todo paciente com `wrong_currency`, sem nada explicar
  // (F4 do QA da T-2). Um cupom que não pode funcionar não deve poder existir.
  if (input.currency !== undefined && input.currency !== null && input.currency !== "") {
    if (typeof input.currency !== "string" || !MOEDAS.includes(input.currency.toUpperCase())) {
      return {
        en: `We charge in ${MOEDAS.join(", ")}.`,
        pt: `Cobramos em ${MOEDAS.join(", ")}.`,
      };
    }
  }

  const escopos = Array.isArray(input.appliesTo) ? input.appliesTo : [];
  if (escopos.length === 0) {
    return {
      en: "Choose where the code applies, or it applies to nothing.",
      pt: "Escolha onde o código vale, senão ele não vale para nada.",
    };
  }
  const conhecidos: CouponScope[] = [
    "CONSULTATION",
    "TREATMENT_SESSION",
    "PACKAGE",
    "TREATMENT_PLAN",
    "MEMBERSHIP",
  ];
  if (escopos.some((e) => !conhecidos.includes(e as CouponScope))) {
    return {
      en: "That is not something a code can apply to.",
      pt: "Isso não é algo a que um código possa se aplicar.",
    };
  }

  if (input.maxPerPatient !== undefined && input.maxPerPatient !== null) {
    const n = Number(input.maxPerPatient);
    if (!Number.isInteger(n) || n < 1) {
      return { en: "Each patient can use it at least once.", pt: "Cada paciente pode usar ao menos uma vez." };
    }
  }
  if (input.maxRedemptions !== undefined && input.maxRedemptions !== null && input.maxRedemptions !== "") {
    const n = Number(input.maxRedemptions);
    if (!Number.isInteger(n) || n < 1) {
      return { en: "A total limit must be at least one.", pt: "O limite total tem de ser de pelo menos um." };
    }
  }

  // Data que não é data é recusada com frase — antes ela virava `Invalid Date`,
  // chegava ao Prisma e estourava num 500 sem corpo (F1 do QA da T-2).
  const inicio = input.startsAt ? limiteDoDia(input.startsAt, "inicio") : null;
  const fim = input.endsAt ? limiteDoDia(input.endsAt, "fim") : null;
  if (input.startsAt && !inicio) {
    return { en: "That start date is not a date.", pt: "Essa data de início não é uma data." };
  }
  if (input.endsAt && !fim) {
    return { en: "That end date is not a date.", pt: "Essa data de fim não é uma data." };
  }
  if (inicio && fim && fim <= inicio) {
    return { en: "The end date comes after the start.", pt: "A data de fim vem depois da de início." };
  }

  return null;
}
