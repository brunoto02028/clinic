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
 * mesmo tempo, e uma sincronização são cerca de treze chamadas.
 *
 * Um gesto sem tecto, numa tela que convida a repeti-lo, é um 601 à espera de
 * acontecer — e o 601 não falha a chamada de quem puxou: falha a de quem vier a
 * seguir, que não fez nada.
 *
 * ## O relógio é **quando pedimos**, não quando o servidor conseguiu
 *
 * A primeira versão media a idade pelo `lastSyncedAt` da ligação, argumentando
 * que é a verdade do servidor e sobrevive a trocar de telemóvel. O QA mediu o
 * que isso fazia numa falha:
 *
 * > `qa119.t8.erro | status=ERROR | lastSyncedAt=2026-10-02T06:36:42Z` →
 * > `valeASincronizacao = true`
 *
 * **Para sempre.** O `lastSyncedAt` só é escrito quando a ingestão termina bem,
 * portanto numa falha ele congela, a idade nunca cresce, e o tecto — a decisão
 * central desta tarefa — deixa de existir a partir da primeira falha, naquele
 * paciente, até alguém reconectar.
 *
 * Então o relógio passou a ser **o nosso**: *quando foi a última vez que pedimos
 * uma sincronização*. Esse avança mesmo quando a sincronização falha, que é
 * exactamente quando o tecto tem de apertar. O `lastSyncedAt` continua a entrar
 * na conta — se o servidor acabou de sincronizar, não há nada a pedir — mas
 * deixou de ser o único.
 *
 * O preço é que o carimbo vive na memória do app e morre quando ele é fechado.
 * É aceitável: reabrir a app é o momento em que se quer os números frescos, e o
 * `lastSyncedAt` cobre esse caso sozinho.
 */

/**
 * Quanto tempo tem de ter passado para valer a pena perguntar à fonte.
 *
 * Dois minutos: curto o bastante para quem acabou de medir no relógio e abriu o
 * app ver o número, e longo o bastante para que puxar a tela cinco vezes
 * seguidas seja **uma** conversa com a Withings, não cinco.
 */
export const INTERVALO_MINIMO_MS = 2 * 60 * 1000;

/**
 * Os estados em que se pode pedir uma sincronização.
 *
 * **Uma lista do que serve, e não uma do que não serve.** A primeira versão
 * excluía `"NEEDS_REAUTH"` — um estado que **não existe neste código**. O schema
 * diz, na própria coluna: `CONNECTED | DISCONNECTED | ERROR`. Eu tinha inferido
 * o nome da mensagem de erro da rota (*"Withings connection needs to be
 * reauthorised"*) e escrito dois testes a fixá-lo, que morriam sob mutação a
 * defender um estado que o banco nunca produz.
 *
 * O efeito real: `ERROR` — o estado que a rota **escreve** quando a Withings
 * falha — passava o filtro. E a rota procura a ligação com `status: 'CONNECTED'`,
 * portanto cada pedido era uma ida e volta para receber 404, com a roda a girar,
 * para sempre.
 *
 * Com uma lista do que serve, um estado novo entra como "não serve" sozinho —
 * que é o lado seguro quando o engano é falar com uma API de terceiros.
 */
const PODE_PEDIR: ReadonlySet<string> = new Set(["CONNECTED"]);

export interface LigacaoParaSincronizar {
  provider?: string | null;
  status?: string | null;
  lastSyncedAt?: string | null;
}

export interface QuandoPedimos {
  /** O instante do nosso último pedido, em ms — ou `null` se ainda não houve. */
  ultimoPedidoMs: number | null;
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
  /**
   * Quando **nós** pedimos pela última vez. Ver o cabeçalho: é este o relógio
   * que avança numa falha, e por isso é ele que faz o tecto existir.
   */
  memoria: QuandoPedimos = { ultimoPedidoMs: null },
  agora: Date = new Date()
): boolean {
  if (!Array.isArray(ligacoes) || ligacoes.length === 0) return false;

  /*
   * As ligações a quem se pode **mesmo** pedir.
   *
   * Sem nenhuma não há fonte: pedir uma sincronização seria pedir ao nosso
   * servidor que descobrisse que não tem a quem perguntar. E uma ligação em
   * `ERROR` ou `DISCONNECTED` conta como não existindo — a rota responde 404 a
   * essas, e a roda giraria pela ida e volta.
   */
  const utilizaveis = ligacoes.filter(
    (l) =>
      (l?.provider ?? "").toUpperCase() === "WITHINGS" &&
      PODE_PEDIR.has((l?.status ?? "").toUpperCase())
  );
  if (utilizaveis.length === 0) return false;

  /*
   * **O nosso pedido manda, mesmo que tenha falhado.** Este é o relógio que
   * avança sempre, e é o que impede o tecto de desaparecer numa ligação
   * partida.
   */
  if (memoria.ultimoPedidoMs !== null) {
    const desdeOPedido = agora.getTime() - memoria.ultimoPedidoMs;
    if (desdeOPedido < INTERVALO_MINIMO_MS) return false;
  }

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
   */
  return agora.getTime() - maisRecente >= INTERVALO_MINIMO_MS;
}
