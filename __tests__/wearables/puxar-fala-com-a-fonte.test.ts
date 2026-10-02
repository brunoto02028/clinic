/**
 * @jest-environment node
 *
 * Puxar a tela fala com a Withings, não só com o nosso banco (119 T-8).
 *
 * ## O pedido
 *
 * > "Podemos atualizar os dados quando entramos no app e baixamos a tela assim?
 * > Dá pra deixar configurado?" — Bruno, 02/10/2026
 *
 * O gesto existia e fazia o que foi construído para fazer: `refetchQueries`,
 * que **relê o nosso banco**. Se a última sincronização foi às 07:05, puxar às
 * 10:20 relia os números de 07:05 com toda a diligência, mostrava a roda a girar
 * e devolvia o mesmo ecrã.
 *
 * Foi o que produziu a contradição que ele viu: *"Steps 182"* aqui e *"Daily
 * Steps 391"* no app deles. Os dois certos — o mesmo contador em dois instantes.
 *
 * ## O que este ficheiro guarda
 *
 * O **tecto**. Sincronizar fala com a API deles, e o limite é de 120 pedidos por
 * minuto por `client_id` — nosso, partilhado por todos os pacientes, e uma
 * sincronização são cerca de uma dúzia de chamadas.
 *
 * Um gesto sem tecto, numa tela que convida a repeti-lo, é um 601 à espera de
 * acontecer. E o 601 não falha a chamada de quem puxou: falha a de quem vier a
 * seguir, que não fez nada.
 */

import {
  valeASincronizacao,
  INTERVALO_MINIMO_MS,
} from "../../mobile/src/lib/sincronizar-se-vale-a-pena";

/** Sem memória de pedido nosso — o caso de quem acabou de abrir a app. */
const semPedido = { ultimoPedidoMs: null };

const agora = new Date("2026-10-02T10:20:00.000Z");
const haMinutos = (n: number) => new Date(agora.getTime() - n * 60000).toISOString();
const withings = (extra: Record<string, unknown> = {}) => ({
  provider: "WITHINGS",
  status: "CONNECTED",
  ...extra,
});

describe("quando vale a pena ir à fonte", () => {
  it("**passados os dois minutos, sim**", () => {
    expect(valeASincronizacao([withings({ lastSyncedAt: haMinutos(195) })], semPedido, agora)).toBe(true);
  });

  it("**e dentro deles, não** — puxar cinco vezes é uma conversa, não cinco", () => {
    expect(valeASincronizacao([withings({ lastSyncedAt: haMinutos(1) })], semPedido, agora)).toBe(false);
    expect(valeASincronizacao([withings({ lastSyncedAt: haMinutos(0) })], semPedido, agora)).toBe(false);
  });

  it("a fronteira é exactamente o intervalo", () => {
    expect(INTERVALO_MINIMO_MS).toBe(2 * 60 * 1000);
    const naLinha = new Date(agora.getTime() - INTERVALO_MINIMO_MS).toISOString();
    const umPouquinhoAntes = new Date(agora.getTime() - INTERVALO_MINIMO_MS + 1).toISOString();
    expect(valeASincronizacao([withings({ lastSyncedAt: naLinha })], semPedido, agora)).toBe(true);
    expect(valeASincronizacao([withings({ lastSyncedAt: umPouquinhoAntes })], semPedido, agora)).toBe(false);
  });

  it("**nunca sincronizada vale sempre** — é quando a pessoa está à espera", () => {
    expect(valeASincronizacao([withings({ lastSyncedAt: null })], semPedido, agora)).toBe(true);
    expect(valeASincronizacao([withings()], semPedido, agora)).toBe(true);
  });

  it("e uma data ilegível é o mesmo que não ter data", () => {
    expect(valeASincronizacao([withings({ lastSyncedAt: "não é data" })], semPedido, agora)).toBe(true);
  });
});

describe("qual das ligações manda", () => {
  it("**a que falou mais recentemente** — o limite já foi gasto por ela", () => {
    /*
     * Quem tem o relógio e a balança tem duas ligações. Se uma sincronizou há
     * dez segundos, o nosso minuto de pedidos já foi gasto agora — olhar para a
     * mais antiga mandaria sincronizar na mesma.
     */
    const r = valeASincronizacao(
      [
        withings({ lastSyncedAt: haMinutos(300) }),
        withings({ lastSyncedAt: haMinutos(0.2) }),
      ],
      semPedido,
      agora
    );
    expect(r).toBe(false);
  });

  it("e se as duas são velhas, vai", () => {
    const r = valeASincronizacao(
      [withings({ lastSyncedAt: haMinutos(300) }), withings({ lastSyncedAt: haMinutos(10) })],
      semPedido,
      agora
    );
    expect(r).toBe(true);
  });
});

describe("quando não há fonte a quem perguntar", () => {
  it("**sem ligação nenhuma, não se tenta**", () => {
    // Seria pedir ao nosso servidor que descobrisse que não tem a quem perguntar.
    expect(valeASincronizacao([], semPedido, agora)).toBe(false);
    expect(valeASincronizacao(null, semPedido, agora)).toBe(false);
    expect(valeASincronizacao(undefined, semPedido, agora)).toBe(false);
  });

  it("**outro provedor não é a Withings**", () => {
    const outro = [{ provider: "FITBIT", status: "CONNECTED", lastSyncedAt: haMinutos(300) }];
    expect(valeASincronizacao(outro, semPedido, agora)).toBe(false);
  });

  it("maiúsculas ou minúsculas, é a mesma ligação", () => {
    expect(
      valeASincronizacao(
        [{ provider: "withings", status: "CONNECTED", lastSyncedAt: haMinutos(300) }],
        semPedido,
        agora
      )
    ).toBe(true);
  });

  it("**uma ligação partida também não** — e os estados são os que o banco tem", () => {
    /*
     * **O achado do QA de 02/10.** A versão anterior excluía `"NEEDS_REAUTH"`,
     * um estado que **não existe neste código**: o schema diz, na própria
     * coluna, `CONNECTED | DISCONNECTED | ERROR`. Eu tinha inferido o nome da
     * mensagem de erro da rota (*"needs to be reauthorised"*) e escrito dois
     * testes a fixá-lo — testes que morriam sob mutação a defender um estado que
     * o banco nunca produz.
     *
     * O efeito real: `ERROR`, que é o que a rota **escreve** quando a Withings
     * falha, passava o filtro. E a rota procura a ligação com
     * `status: 'CONNECTED'`, logo cada pedido era uma ida e volta para receber
     * 404, com a roda a girar — a cada gesto e a cada entrada na aba, sem fim.
     */
    for (const estado of ["ERROR", "DISCONNECTED"]) {
      const r = valeASincronizacao(
        [withings({ status: estado, lastSyncedAt: haMinutos(300) })],
        semPedido,
        agora
      );
      expect(r).toBe(false);
    }
  });

  it("**um estado que ainda não existe entra como 'não serve'**", () => {
    /*
     * A lista é do que **serve**, e não do que não serve. Um estado novo entra
     * pelo lado seguro sozinho — que é o único lado aceitável quando o engano é
     * falar com uma API de terceiros a um tecto partilhado.
     */
    const r = valeASincronizacao(
      [withings({ status: "PAUSADA_QUE_AINDA_NAO_EXISTE", lastSyncedAt: haMinutos(300) })],
      semPedido,
      agora
    );
    expect(r).toBe(false);
  });

  it("mas uma sadia ao lado de uma partida ainda vale", () => {
    const r = valeASincronizacao(
      [
        withings({ status: "ERROR", lastSyncedAt: haMinutos(300) }),
        withings({ status: "CONNECTED", lastSyncedAt: haMinutos(300) }),
      ],
      semPedido,
      agora
    );
    expect(r).toBe(true);
  });
});

describe("o tecto mede **o nosso pedido**, não o sucesso do servidor", () => {
  /**
   * O defeito que o QA mediu e que apagava a tarefa inteira:
   *
   * > `qa119.t8.erro | status=ERROR | lastSyncedAt=2026-10-02T06:36:42Z` →
   * > `valeASincronizacao = true`
   *
   * **Para sempre.** O `lastSyncedAt` só é escrito quando a ingestão termina
   * bem, portanto numa falha ele congela, a idade nunca cresce, e o tecto — a
   * decisão central desta tarefa — deixava de existir a partir da primeira
   * falha.
   *
   * O relógio passou a ser o nosso: *quando foi a última vez que pedimos*. Esse
   * avança mesmo quando a sincronização falha, que é exactamente quando o tecto
   * tem de apertar.
   */
  const pedimosHa = (minutos: number) => ({
    ultimoPedidoMs: agora.getTime() - minutos * 60000,
  });

  it("**pedimos há um minuto: não se pede outra vez**, mesmo com o servidor parado há horas", () => {
    const r = valeASincronizacao(
      [withings({ lastSyncedAt: haMinutos(300) })],
      pedimosHa(1),
      agora
    );
    expect(r).toBe(false);
  });

  it("passados os dois minutos desde o nosso pedido, pede-se de novo", () => {
    const r = valeASincronizacao(
      [withings({ lastSyncedAt: haMinutos(300) })],
      pedimosHa(3),
      agora
    );
    expect(r).toBe(true);
  });

  it("**e o do servidor continua a contar** — se ele acabou de sincronizar, não há nada a pedir", () => {
    // Os dois relógios valem: o nosso impede a rajada, o dele impede o inútil.
    const r = valeASincronizacao(
      [withings({ lastSyncedAt: haMinutos(1) })],
      pedimosHa(300),
      agora
    );
    expect(r).toBe(false);
  });

  it("sem pedido nosso nenhum, decide o do servidor", () => {
    expect(
      valeASincronizacao([withings({ lastSyncedAt: haMinutos(300) })], semPedido, agora)
    ).toBe(true);
  });
});

describe("um relógio dessincronizado não vira sincronização a cada gesto", () => {
  it("**um carimbo no futuro trata-se como acabado de fazer**", () => {
    /*
     * Uma idade negativa passaria sempre no teste do intervalo, e cada gesto
     * seria uma ida à API. No pior caso espera-se dois minutos — é a leitura
     * segura.
     */
    const futuro = new Date(agora.getTime() + 60 * 60 * 1000).toISOString();
    expect(valeASincronizacao([withings({ lastSyncedAt: futuro })], semPedido, agora)).toBe(false);
  });
});

describe("o caso do Bruno, reproduzido", () => {
  it("**às 10:20, com a última sincronização às 07:05, puxar vai à fonte**", () => {
    const r = valeASincronizacao(
      [withings({ lastSyncedAt: "2026-10-02T07:05:00.000Z" })],
      semPedido,
      agora
    );
    expect(r).toBe(true);
  });
});
