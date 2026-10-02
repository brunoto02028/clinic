/**
 * @jest-environment node
 *
 * Onde cada métrica mora — e porque três telas estavam a olhar para a gaveta
 * errada (119 T-9).
 *
 * ## Como apareceu
 *
 * O Bruno gerou o primeiro relatório pelo app e mandou-o ao lado da aba Saúde:
 *
 * | a aba mostrava | o relatório mostrava |
 * |---|---|
 * | Resting HR **54 bpm** | — |
 * | SpO2 **99%** | — |
 * | Steps 1.590 | Steps **919.5** |
 *
 * > *"Está faltando bastante informação no relatório né?"*
 *
 * ## O defeito
 *
 * A ingestão da Withings escreve o `WearableDataPoint` em `ACTIVITY`, `VITALS` e
 * `SLEEP`. **Nunca** escreve `BODY` — o único escritor de `BODY` no repositório
 * é o webhook da Terra, que está desligado.
 *
 * E três leitores procuravam `restingHr`, `hrv` e `spo2` em `BODY`: o relatório
 * do paciente, a tela de monitoramento da clínica, e a **detecção de desvio**.
 * Como só a Withings está ligada, isso valia para todos os pacientes: a clínica
 * via três linhas vazias e um alerta que nunca disparava.
 *
 * Uma série vazia é indistinguível de uma série estável. Foi preciso alguém pôr
 * duas telas lado a lado.
 *
 * ## Porque os testes não apanharam
 *
 * Porque **o mock ensinava o erro**: a fixture da detecção construía pontos com
 * `dataType: "BODY"`, o código procurava `BODY`, e os dois concordavam sobre uma
 * gaveta que o banco nunca enche.
 */

import {
  serieDaMetrica,
  comoSeEscreve,
  ONDE_MORA,
  SAO_CONTAGEM,
} from "../../lib/onde-mora-a-metrica";

/** Um ponto como o `WearableDataPoint` o guarda. */
const ponto = (tipo: string, dia: string, campos: Record<string, number>) => ({
  dataType: tipo,
  dataDate: dia,
  ...campos,
});

describe("cada métrica vem do balde que a ingestão enche", () => {
  it("**o sono, a VFC e a FC de repouso vêm de `SLEEP`**", () => {
    const pontos = [
      ponto("SLEEP", "2026-10-01", { sleepDuration: 420, hrv: 40, restingHr: 54 }),
    ];
    expect(serieDaMetrica(pontos, "sleepDuration")).toEqual([{ dia: "2026-10-01", valor: 420 }]);
    expect(serieDaMetrica(pontos, "hrv")).toEqual([{ dia: "2026-10-01", valor: 40 }]);
    expect(serieDaMetrica(pontos, "restingHr")).toEqual([{ dia: "2026-10-01", valor: 54 }]);
  });

  it("**o SpO2 vem de `VITALS`**", () => {
    const pontos = [ponto("VITALS", "2026-10-01", { spo2: 99 })];
    expect(serieDaMetrica(pontos, "spo2")).toEqual([{ dia: "2026-10-01", valor: 99 }]);
  });

  it("**os passos vêm de `ACTIVITY`**", () => {
    const pontos = [ponto("ACTIVITY", "2026-10-01", { steps: 1590 })];
    expect(serieDaMetrica(pontos, "steps")).toEqual([{ dia: "2026-10-01", valor: 1590 }]);
  });

  it("**e `BODY` não dá nada** — a Withings nunca o escreve", () => {
    const pontos = [ponto("BODY", "2026-10-01", { restingHr: 54, hrv: 40, spo2: 99 })];
    expect(serieDaMetrica(pontos, "restingHr")).toEqual([]);
    expect(serieDaMetrica(pontos, "hrv")).toEqual([]);
    expect(serieDaMetrica(pontos, "spo2")).toEqual([]);
  });

  it("nenhuma métrica aponta para `BODY`", () => {
    for (const [campo, baldes] of Object.entries(ONDE_MORA)) {
      expect(baldes).not.toContain("BODY");
      expect(baldes.length).toBeGreaterThan(0);
    }
  });

  it("um campo que não está no mapa devolve vazio, e não rebenta", () => {
    expect(serieDaMetrica([ponto("SLEEP", "2026-10-01", { xpto: 1 })], "xpto")).toEqual([]);
  });
});

describe("a FC de repouso mora em dois sítios, e isso é uma escolha", () => {
  /**
   * A Withings entrega-a no resumo do **sono** e nas medições do **dia**, e não
   * são a mesma coisa: a do sono é a frequência em repouso de verdade — a noite
   * inteira, deitado —, e a das medições é a média do que o aparelho capturou
   * durante o dia, que depende de quando a pessoa mediu.
   */
  it("**o mesmo dia nos dois baldes conta uma vez** — e ganha a do sono", () => {
    /*
     * Este é o caso **normal**, não uma exceção: a ingestão escreve a FC de
     * repouso em `SLEEP` e em `VITALS` para o mesmo dia. Sem isto, esse dia
     * entrava duas vezes na média e pesava a dobrar.
     */
    const pontos = [
      ponto("VITALS", "2026-10-01", { restingHr: 70 }),
      ponto("SLEEP", "2026-10-01", { restingHr: 54 }),
    ];
    expect(serieDaMetrica(pontos, "restingHr")).toEqual([{ dia: "2026-10-01", valor: 54 }]);
  });

  it("**e a das medições serve os dias sem noite registada**", () => {
    const pontos = [
      ponto("SLEEP", "2026-10-01", { restingHr: 54 }),
      ponto("VITALS", "2026-10-02", { restingHr: 71 }),
    ];
    expect(serieDaMetrica(pontos, "restingHr")).toEqual([
      { dia: "2026-10-01", valor: 54 },
      { dia: "2026-10-02", valor: 71 },
    ]);
  });

  it("a ordem do mapa é a preferência, e está escrita", () => {
    expect(ONDE_MORA.restingHr).toEqual(["SLEEP", "VITALS"]);
  });

  it("**uma noite sem o número cede a vez às medições do mesmo dia**", () => {
    // `null` não é um valor: é a ausência dele, e não deve bloquear o recurso.
    const pontos = [
      { dataType: "SLEEP", dataDate: "2026-10-01", restingHr: null },
      ponto("VITALS", "2026-10-01", { restingHr: 70 }),
    ];
    expect(serieDaMetrica(pontos as any, "restingHr")).toEqual([{ dia: "2026-10-01", valor: 70 }]);
  });

  it("a série sai ordenada por dia", () => {
    const pontos = [
      ponto("SLEEP", "2026-10-03", { hrv: 30 }),
      ponto("SLEEP", "2026-10-01", { hrv: 50 }),
      ponto("SLEEP", "2026-10-02", { hrv: 40 }),
    ];
    expect(serieDaMetrica(pontos, "hrv").map((v) => v.dia)).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });
});

describe("o que se conta e o que se mede", () => {
  it("**passos arredondam** — ninguém deu meio passo", () => {
    // `Steps 919.5` foi ao papel do paciente.
    expect(comoSeEscreve("steps", 919.5)).toBe(920);
    expect(comoSeEscreve("calories", 310.4)).toBe(310);
  });

  it("**e o que é medido fica como está**", () => {
    // Arredondar uma média de pressão ou de VFC perderia informação real.
    expect(comoSeEscreve("spo2", 97.3)).toBe(97.3);
    expect(comoSeEscreve("hrv", 41.5)).toBe(41.5);
    expect(comoSeEscreve("sleepDuration", 223.4)).toBe(223.4);
  });

  it("**um buraco não se arredonda para zero**", () => {
    expect(comoSeEscreve("steps", null)).toBeNull();
    expect(comoSeEscreve("spo2", null)).toBeNull();
  });

  it("e a lista do que é contagem não inclui nada que se meça", () => {
    for (const medida of ["spo2", "hrv", "restingHr", "sleepDuration", "bodyTemperature"]) {
      expect(SAO_CONTAGEM.has(medida)).toBe(false);
    }
  });
});
