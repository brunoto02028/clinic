/**
 * @jest-environment node
 *
 * O paciente pede um relatório dele (118 T-5).
 *
 * > *"Vou querer relatório de todos os dados do paciente ok? Nosso sistema
 * > precisa entregar isso"*
 * >
 * > *"Quero poder gerar esses reports detalhados que servirão para os pacientes
 * > buscarem ajuda médica ou de outros profissionais quando quiserem."* — Bruno
 *
 * ## O que este ficheiro guarda
 *
 * Três coisas, e nenhuma delas é o relatório — esse já existia e já era bom.
 *
 * 1. **O tecto.** Gerar um são nove consultas pesadas ao banco. Um botão sem
 *    tecto numa tela é um botão que alguém carrega dez vezes.
 * 2. **A janela**, presa ao que faz sentido em vez de recusada.
 * 3. **Que o valor novo do enum não liga o cron.** Este é o que podia magoar
 *    alguém: `ON_DEMAND` caía no ramo semanal do `inicioDoPeriodo`, e um
 *    paciente marcado como *"só a pedido"* passaria a receber um relatório
 *    automático toda a segunda-feira — contra a regra em vigor de que nada
 *    chega a um paciente sem alguém decidir.
 */

import {
  janelaEmDias,
  reaproveitarRelatorio,
  periodoDoRelatorio,
  INTERVALO_ENTRE_PEDIDOS_MS,
  DIAS_PADRAO,
  DIAS_MINIMO,
  DIAS_MAXIMO,
} from "../../lib/relatorio-a-pedido";
import {
  geraSozinho,
  inicioDoPeriodo,
  type Cadencia,
} from "../../lib/patient-report-schedule";

const agora = new Date("2026-10-02T10:20:00.000Z");

describe("a janela prende-se, não se recusa", () => {
  it("por omissão são **noventa dias** — trajectória, não semana", () => {
    // O pedido é levar o papel a um médico, e um médico quer ver a trajectória.
    expect(DIAS_PADRAO).toBe(90);
    expect(janelaEmDias(undefined)).toBe(90);
    expect(janelaEmDias(null)).toBe(90);
    expect(janelaEmDias({})).toBe(90);
    expect(janelaEmDias("")).toBe(90);
  });

  it("**quem pede três mil dias quer tudo** — recebe o máximo, não um erro", () => {
    expect(janelaEmDias(3000)).toBe(DIAS_MAXIMO);
    expect(janelaEmDias(366)).toBe(365);
  });

  it("e quem pede um dia recebe o mínimo", () => {
    expect(janelaEmDias(1)).toBe(DIAS_MINIMO);
    expect(janelaEmDias(7)).toBe(7);
  });

  it("um número no meio passa como está, arredondado", () => {
    expect(janelaEmDias(30)).toBe(30);
    expect(janelaEmDias("30")).toBe(30);
    expect(janelaEmDias(30.4)).toBe(30);
  });

  it("**lixo não vira zero dias**", () => {
    // Zero dias geraria um relatório vazio que a pessoa leria como "não tenho
    // nada", quando o que houve foi um pedido mal formado.
    expect(janelaEmDias("abc")).toBe(DIAS_PADRAO);
    expect(janelaEmDias(-5)).toBe(DIAS_PADRAO);
    expect(janelaEmDias(0)).toBe(DIAS_PADRAO);
    expect(janelaEmDias(NaN)).toBe(DIAS_PADRAO);
    expect(janelaEmDias(Infinity)).toBe(DIAS_PADRAO);
  });
});

describe("o tecto entre dois pedidos", () => {
  const haMinutos = (n: number) => new Date(agora.getTime() - n * 60000);

  it("**dentro de dez minutos devolve o último**, em vez de gerar outro", () => {
    const r = reaproveitarRelatorio({ id: "rel-1", createdAt: haMinutos(3) }, agora);
    expect(r).toBe("rel-1");
  });

  it("**e devolve, em vez de recusar** — carregar duas vezes não é um erro", () => {
    expect(reaproveitarRelatorio({ id: "rel-1", createdAt: agora }, agora)).toBe("rel-1");
  });

  it("passados os dez minutos, gera um novo", () => {
    expect(INTERVALO_ENTRE_PEDIDOS_MS).toBe(10 * 60 * 1000);
    expect(reaproveitarRelatorio({ id: "rel-1", createdAt: haMinutos(11) }, agora)).toBeNull();
  });

  it("a fronteira é exactamente o intervalo", () => {
    const naLinha = new Date(agora.getTime() - INTERVALO_ENTRE_PEDIDOS_MS);
    const logoAntes = new Date(agora.getTime() - INTERVALO_ENTRE_PEDIDOS_MS + 1);
    expect(reaproveitarRelatorio({ id: "x", createdAt: naLinha }, agora)).toBeNull();
    expect(reaproveitarRelatorio({ id: "x", createdAt: logoAntes }, agora)).toBe("x");
  });

  it("**sem nenhum anterior, gera**", () => {
    expect(reaproveitarRelatorio(null, agora)).toBeNull();
    expect(reaproveitarRelatorio(undefined, agora)).toBeNull();
    expect(reaproveitarRelatorio({ id: "", createdAt: agora }, agora)).toBeNull();
  });

  it("uma data ilegível não reaproveita nada", () => {
    expect(reaproveitarRelatorio({ id: "x", createdAt: "não é data" }, agora)).toBeNull();
  });

  it("**um carimbo no futuro reaproveita** — o erro barato é esperar", () => {
    /*
     * Relógios de servidor dessincronizados dão idade negativa. Reaproveitar
     * custa à pessoa uma espera; o contrário custa ao banco nove consultas por
     * toque, e sem tecto nenhum.
     */
    const futuro = new Date(agora.getTime() + 60 * 60 * 1000);
    expect(reaproveitarRelatorio({ id: "x", createdAt: futuro }, agora)).toBe("x");
  });
});

describe("o período é um instante, não um dia", () => {
  it("**o início carrega a hora** — senão dois pedidos do mesmo dia colidem", () => {
    /*
     * A chave é `(patientId, cadence, periodStart)`. Arredondar ao dia faria o
     * segundo pedido bater na linha do primeiro, e quem mediu ao meio-dia
     * ficaria preso ao retrato das nove da manhã.
     */
    const { inicio, fim } = periodoDoRelatorio(90, agora);
    expect(fim.toISOString()).toBe(agora.toISOString());
    expect(inicio.getUTCHours()).toBe(agora.getUTCHours());
    expect(inicio.getUTCMinutes()).toBe(agora.getUTCMinutes());
  });

  it("e cobre exactamente os dias pedidos", () => {
    const { inicio, fim } = periodoDoRelatorio(90, agora);
    expect((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)).toBeCloseTo(90, 6);
  });

  it("dois pedidos seguidos dão períodos diferentes", () => {
    const a = periodoDoRelatorio(30, new Date("2026-10-02T09:00:00.000Z"));
    const b = periodoDoRelatorio(30, new Date("2026-10-02T14:00:00.000Z"));
    expect(a.inicio.toISOString()).not.toBe(b.inicio.toISOString());
  });
});

describe("o valor novo do enum não liga o cron", () => {
  /**
   * **O que podia magoar alguém.** `ON_DEMAND` entrou no `ReportCadence` para
   * marcar a linha de um relatório pedido. Mas o mesmo enum é o tipo do campo
   * `reportCadence` do **paciente** — a cadência com que o cron gera sozinho.
   *
   * O `inicioDoPeriodo` testava `NONE`, testava `DAILY`, e **tudo o resto caía
   * no ramo semanal**. Um paciente marcado como "só a pedido" passaria a
   * receber um relatório automático toda a segunda-feira, contra a regra de que
   * nada chega a um paciente sem alguém decidir.
   *
   * O `as Cadencia` na rodada escondia-o: o tipo dizia que não podia acontecer
   * enquanto o banco dizia que podia.
   */
  it("**`ON_DEMAND` não gera sozinho**", () => {
    expect(geraSozinho("ON_DEMAND")).toBe(false);
    expect(inicioDoPeriodo("ON_DEMAND" as Cadencia, agora)).toBeNull();
  });

  it("`NONE` também não, como sempre", () => {
    expect(geraSozinho("NONE")).toBe(false);
    expect(inicioDoPeriodo("NONE", agora)).toBeNull();
  });

  it("**diário e semanal continuam a gerar**", () => {
    expect(geraSozinho("DAILY")).toBe(true);
    expect(geraSozinho("WEEKLY")).toBe(true);
    expect(inicioDoPeriodo("DAILY", agora)).not.toBeNull();
    expect(inicioDoPeriodo("WEEKLY", agora)).not.toBeNull();
  });

  it("**um valor que ainda não existe entra como 'não gera'**", () => {
    /*
     * A lista é do que **gera**, não do que não gera. Um valor novo no enum
     * entra pelo lado seguro sozinho — que é o único lado aceitável quando o
     * engano manda um relatório a um paciente sem ninguém pedir.
     */
    expect(geraSozinho("MENSAL_QUE_AINDA_NAO_EXISTE")).toBe(false);
    expect(geraSozinho(null)).toBe(false);
    expect(geraSozinho(undefined)).toBe(false);
    expect(geraSozinho("")).toBe(false);
  });

  it("e o diário continua a ser ontem, e o semanal a segunda passada", () => {
    // Âncoras fixas: o relatório de uma semana tem de ser o mesmo
    // independentemente da hora a que o contentor acordou.
    expect(inicioDoPeriodo("DAILY", agora)!.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(inicioDoPeriodo("WEEKLY", agora)!.toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });
});
