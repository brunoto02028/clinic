import { isProfissionalExterno } from "@/lib/tenant-type";

/**
 * O repasse ao profissional — **a parte pura** (102 T-6).
 *
 * Sem Prisma de propósito: a tela de configurações do inquilino importa o
 * percentual padrão daqui, e arrastar o cliente do banco para dentro de um
 * componente de navegador seria o erro que `lib/repasse-server.ts` existe para
 * não deixar acontecer.
 *
 * O Bruno: *"a BPR cobra do paciente, recebe e repassa o percentual aos
 * profissionais"*.
 *
 * ## Por que cobrança com destino, e não cobrança na conta dele
 *
 * O Stripe tem os dois: a cobrança nasce na conta do profissional e a
 * plataforma tira uma taxa, ou nasce na da plataforma e é **transferida**.
 *
 * O pedido decide: *"a BPR cobra… recebe… e repassa"*. Quem recebe é a BPR, e
 * por isso a cobrança é dela, com `transfer_data.destination` apontando para o
 * profissional. O produto do personal (atividade 28) faz o contrário, de
 * propósito — lá o estúdio é o negócio e a BPR só passa a régua.
 *
 * ## O que "pronto" significa
 *
 * Ter conta não basta. Uma conta que não pode receber faz o dinheiro entrar na
 * BPR e **ficar lá**, sem ninguém para repassar — e quem descobre é o
 * profissional, no fim do mês. Por isso `podeReceber` exige o cadastro
 * concluído, e a T-5 esconde do catálogo quem não passa.
 */

/** Quanto por cento a plataforma retém, quando o profissional não define. */
export const PERCENTUAL_PADRAO = 20;

export interface DestinoDoRepasse {
  /** A conta conectada que recebe. */
  destination: string;
  /** O que fica com a BPR, em centavos. */
  applicationFeeCents: number;
}

/**
 * Este inquilino pode receber repasse?
 *
 * Três condições: é profissional intermediado, tem conta conectada, e o
 * cadastro dela está concluído (`stripeOnboarded`, que é `charges_enabled`).
 */
export function podeReceber(clinic: {
  type?: string | null;
  stripeAccountId?: string | null;
  stripeOnboarded?: boolean | null;
}): boolean {
  if (!isProfissionalExterno(clinic.type)) return false;
  return !!clinic.stripeAccountId && !!clinic.stripeOnboarded;
}

/**
 * O percentual que fica com a plataforma, em centavos sobre o valor cobrado.
 *
 * Arredonda **para baixo**: um centavo a mais na taxa é um centavo a menos no
 * repasse, e o erro tem de cair para o lado de quem trabalhou.
 */
export function taxaEmCentavos(valorEmCentavos: number, percentual: number | null | undefined): number {
  const p = percentual ?? PERCENTUAL_PADRAO;
  if (!(p > 0)) return 0;
  // Nunca mais que o valor: um percentual mal cadastrado não pode zerar o
  // repasse nem fazer o Stripe recusar a cobrança inteira.
  const bruto = Math.floor((valorEmCentavos * Math.min(p, 100)) / 100);
  return Math.max(0, Math.min(bruto, valorEmCentavos));
}
