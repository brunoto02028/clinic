/**
 * Esta consulta espera pagamento? (101 T-3)
 *
 * ## Por que existe, e por que fica num lugar só
 *
 * O Bruno: *"o paciente vai ter que pagar e fazer a confirmação do
 * agendamento. No pagamento já é a confirmação"*.
 *
 * Três telas precisam da mesma resposta — a lista, o detalhe e o painel da
 * clínica —, e três cópias da regra divergem. Foi o que aconteceu com a queda
 * de língua do material educativo no mesmo dia.
 *
 * ## O que a regra não é
 *
 * **Não é autorização.** Quem recusa é o servidor: a rota de checkout exige
 * `status: "PENDING"`, preço acima de zero, e que a consulta seja desta
 * pessoa. Um botão escondido continua sendo uma requisição que alguém pode
 * fazer à mão.
 */
export type EstadoDoPagamento =
  /** Espera o cartão, e é o pagamento que confirma. */
  | "espera_cartao"
  /** Vai ser paga na clínica: nada a fazer no telefone. */
  | "paga_na_clinica"
  /** Cortesia, pacote, isenção — não há o que pagar. */
  | "nada_a_pagar"
  /** Já paga, cancelada, concluída: o assunto está encerrado. */
  | "resolvido";

export function estadoDoPagamento(a: {
  status: string;
  price?: number | null;
  paymentMethod?: string | null;
  payment?: { status: string } | null;
}): EstadoDoPagamento {
  // Uma consulta desmarcada não cobra nada, e uma já concluída não é assunto
  // do telefone — mesmo que alguém tenha esquecido de marcar como paga.
  if (["CANCELLED", "NO_SHOW", "COMPLETED"].includes(a.status)) return "resolvido";

  /**
   * Só `PENDING` espera pagamento.
   *
   * `CONFIRMED` é o que o webhook escreve quando o dinheiro entra — e também
   * o que a clínica grava numa cortesia, que nasce confirmada justamente
   * porque não há pagamento que a confirme.
   */
  if (a.status !== "PENDING") return "resolvido";

  if (a.payment?.status === "COMPLETED") return "resolvido";
  if (!a.price || a.price <= 0) return "nada_a_pagar";
  if (a.paymentMethod === "IN_PERSON") return "paga_na_clinica";
  return "espera_cartao";
}

/** Atalho para as telas: dá para abrir o pagamento agora? */
export function podePagarAgora(a: Parameters<typeof estadoDoPagamento>[0]): boolean {
  return estadoDoPagamento(a) === "espera_cartao";
}

/** As frases das quatro situações, nas duas línguas. */
export const TEXTO_DO_PAGAMENTO = {
  espera_cartao: {
    en: { titulo: "Waiting for your payment", corpo: "This appointment is confirmed as soon as you pay." },
    pt: { titulo: "Esperando seu pagamento", corpo: "A consulta fica confirmada assim que você pagar." },
  },
  paga_na_clinica: {
    en: { titulo: "Pay at the clinic", corpo: "Nothing to do here — you pay when you arrive." },
    pt: { titulo: "Pagar na clínica", corpo: "Nada a fazer aqui — você paga quando chegar." },
  },
  nada_a_pagar: {
    en: { titulo: "Nothing to pay", corpo: "This one is covered." },
    pt: { titulo: "Nada a pagar", corpo: "Esta já está coberta." },
  },
} as const;
