/**
 * Quais janelas de medição podem receber uma leitura.
 *
 * A janela delimita **tempo**: três minutos em que a leitura do manguito da
 * clínica pertence a um paciente nomeado. O estado da sessão é rótulo de
 * interface — serve para a tela saber se ainda está contando — e não deveria
 * decidir de quem é uma medição que já aconteceu.
 *
 * Era o que decidia. `matchingSessions` comparava contra o horário da medição,
 * nunca contra `now()`, justamente para aguentar a leitura que chega atrasada;
 * mas exigia `status: OPEN`, e as janelas vencidas são fechadas toda vez que
 * alguém abre a tela de medição. Em visita domiciliar isso quebrava: o
 * terapeuta abria a janela na casa do paciente, media, o manguito não achava
 * rede conhecida; de volta à clínica a varredura marcava aquela sessão como
 * `EXPIRED`; quando a leitura finalmente subia, não casava com nada e ia para
 * a caixa de entrada — com a resposta certa existindo e sendo descartada.
 * Apontado pelo Bruno em 24/09/2026.
 *
 * Duas exclusões continuam valendo, e por motivos diferentes:
 *
 * - `CANCELLED` é o terapeuta dizendo **não atribua isto**. Uma intenção
 *   explícita não é vencida por um horário que bate.
 * - `COMPLETED` já recebeu a sua leitura. Aceitá-la de novo faria a segunda
 *   medição da mesma janela cair no mesmo paciente sem ninguém confirmar — e
 *   uma segunda medição costuma ser uma repetição, não outra pessoa, mas
 *   "costuma" não é base para escrever num prontuário.
 *
 * Sem imports de propósito: a decisão é o que pode regredir em silêncio, e
 * assim ela é testável sem banco.
 */

/** Folga antes da janela abrir: o manguito às vezes já está inflando. */
export const SESSION_GRACE_MS = 30 * 1000;

/**
 * Os estados que ainda podem receber uma leitura.
 *
 * `EXPIRED` entra porque a janela expirada continua descrevendo um intervalo
 * de tempo verdadeiro. O que ela perdeu foi a contagem na tela, não o fato.
 */
export const MATCHABLE_SESSION_STATUSES = ["OPEN", "EXPIRED"] as const;

export interface SessionWindow {
  id: string;
  status: string;
  openedAt: Date | string;
  expiresAt: Date | string;
}

const ms = (d: Date | string) => new Date(d).getTime();

/** Se esta janela contém o instante da medição. */
export function sessionCovers(session: SessionWindow, measuredAt: Date | string): boolean {
  if (!(MATCHABLE_SESSION_STATUSES as readonly string[]).includes(session.status)) return false;
  const t = ms(measuredAt);
  return ms(session.openedAt) <= t + SESSION_GRACE_MS && ms(session.expiresAt) >= t;
}

export type SessionPick =
  | { kind: "assigned"; session: SessionWindow }
  | { kind: "none" }
  | { kind: "ambiguous"; count: number };

/**
 * De quem é esta leitura.
 *
 * A regra de ouro do módulo, e a que não muda: **ambiguidade nunca vira
 * palpite.** Duas janelas cobrindo o mesmo instante mandam a leitura para a
 * caixa de entrada, onde uma pessoa decide. Pressão no prontuário errado é
 * erro clínico; pedir um clique não é.
 */
export function pickSession(
  sessions: readonly SessionWindow[],
  measuredAt: Date | string
): SessionPick {
  const cobrem = sessions.filter((s) => sessionCovers(s, measuredAt));
  if (cobrem.length === 1) return { kind: "assigned", session: cobrem[0] };
  if (cobrem.length === 0) return { kind: "none" };
  return { kind: "ambiguous", count: cobrem.length };
}
