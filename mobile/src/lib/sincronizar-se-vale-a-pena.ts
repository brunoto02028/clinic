/**
 * Quando é que puxar a tela vale uma conversa com a Withings (119 T-8).
 *
 * ## O que o gesto fazia, e porque não chegava
 *
 * A 087 T-1 pôs o *puxar para atualizar* em todas as telas, e ele faz o que foi
 * construído para fazer: **relê o nosso banco**. Se a última sincronização foi
 * às 07:05, puxar às 10:20 relê com toda a diligência os números de 07:05 e
 * devolve o mesmo ecrã, depois de mostrar a roda a girar.
 *
 * Foi o que produziu a contradição de 02/10/2026: o nosso app dizia *"Steps
 * 182"* e o da Withings dizia *"Daily Steps 391"*. Os dois certos — o mesmo
 * contador em dois instantes.
 *
 * ## Porque não é "sincroniza sempre"
 *
 * O limite publicado é de **120 pedidos por minuto por `client_id`**. O
 * `client_id` é nosso, partilhado por **todos** os pacientes a sincronizar ao
 * mesmo tempo, e uma sincronização são cerca de uma dúzia de chamadas.
 *
 * Um gesto sem tecto, numa tela que convida a repeti-lo, é um 601 à espera de
 * acontecer — e o 601 não falha a chamada de quem puxou: falha a de quem vier a
 * seguir, que não fez nada.
 *
 * ## Porque o relógio é o do servidor
 *
 * `lastSyncedAt` já vem na resposta que a tela usa, é a verdade de quem
 * sincroniza, e sobrevive a trocar de telemóvel. Um carimbo guardado no aparelho
 * diria *"sincronizei agora"* num e *"nunca sincronizei"* no outro, para a mesma
 * pessoa — e o segundo iria à API sem precisar.
 */

/**
 * Quanto tempo tem de ter passado para valer a pena perguntar à fonte.
 *
 * Dois minutos: curto o bastante para quem acabou de medir no relógio e abriu o
 * app ver o número, e longo o bastante para que puxar a tela cinco vezes
 * seguidas seja **uma** conversa com a Withings, não cinco.
 */
export const INTERVALO_MINIMO_MS = 2 * 60 * 1000;

export interface LigacaoParaSincronizar {
  provider?: string | null;
  status?: string | null;
  lastSyncedAt?: string | null;
}

/**
 * Vale a pena falar com a Withings agora?
 *
 * `false` não quer dizer "não atualizes" — quer dizer "atualiza do nosso banco,
 * que é o que já estava a acontecer". Quem chama relê sempre; isto só decide a
 * ida à fonte.
 */
export function valeASincronizacao(
  ligacoes: LigacaoParaSincronizar[] | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!Array.isArray(ligacoes) || ligacoes.length === 0) return false;

  /*
   * As ligações a quem se pode **mesmo** perguntar.
   *
   * Sem nenhuma não há fonte: pedir uma sincronização seria pedir ao nosso
   * servidor que descobrisse que não tem a quem perguntar.
   *
   * E uma que precisa de reautorização conta como não existindo: o servidor
   * responderia erro, e quem puxou veria a roda girar mais tempo para nada. Quem
   * resolve isso é a tela dos aparelhos, e a pendência já aponta para lá.
   */
  const utilizaveis = ligacoes.filter(
    (l) =>
      (l?.provider ?? "").toUpperCase() === "WITHINGS" &&
      (l?.status ?? "").toUpperCase() !== "NEEDS_REAUTH"
  );
  if (utilizaveis.length === 0) return false;

  /*
   * **Nunca sincronizada vale sempre.** É a primeira vez, e é exactamente o
   * momento em que a pessoa está à espera de ver os números aparecerem.
   */
  const comData = utilizaveis.filter((l) => !!l.lastSyncedAt);
  if (comData.length === 0) return true;

  /*
   * A **mais recente** de todas: quem tem o relógio e a balança tem duas
   * ligações, e se uma falou com a Withings há dez segundos, o limite já foi
   * gasto agora.
   */
  let maisRecente = -Infinity;
  for (const l of comData) {
    const t = new Date(l.lastSyncedAt as string).getTime();
    if (Number.isNaN(t)) continue;
    if (t > maisRecente) maisRecente = t;
  }
  /* Todas as datas ilegíveis é o mesmo que não ter data: vale a pena. */
  if (maisRecente === -Infinity) return true;

  /*
   * Um carimbo no **futuro** — relógios dessincronizados — dá idade negativa, e
   * cai sozinho neste `>=`: trata-se como acabado de sincronizar, que é a
   * leitura segura (no pior caso espera-se dois minutos).
   *
   * Havia aqui um `if (idade < 0) return false` a dizer isto por extenso. Uma
   * mutação mostrou que ele nunca mudava a resposta — era uma guarda morta a
   * fingir que protegia alguma coisa. O teste do carimbo no futuro fica, porque
   * o que importa guardar é o comportamento, não a linha.
   */
  return agora.getTime() - maisRecente >= INTERVALO_MINIMO_MS;
}
