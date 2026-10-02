/**
 * @jest-environment node
 *
 * Os leitores concordam sobre onde cada métrica mora, e o papel mostra o ECG.
 *
 * ## Os dois achados do code review de 02/10/2026
 *
 * **O relatório nunca mostrava um ECG.** O `getMonitoringData` construía a lista
 * com `pontos.map(lerEcg)`, e o `lerEcg` exige `dataType: "ECG"` — um balde que
 * ninguém escreve desde que a 119 T-2 mudou o ECG para o `EcgRecording`, uma
 * linha por gravação. A secção não saía no papel de **nenhum** paciente,
 * incluindo um a quem o relógio tivesse detectado fibrilhação.
 *
 * E o agravante: eu corrigi essa mesma coisa ao lado, nesse mesmo dia, na rota
 * do painel da clínica — com um comentário a explicá-la — e não corrigi aqui.
 *
 * **O quarto leitor contava o dia a dobrar.** O mapa `ONDE_MORA` foi criado para
 * acabar com cada leitor a escolher o balde de memória; três foram migrados e o
 * do resumo da aba não. Como a ingestão escreve `restingHr` em `SLEEP` **e** em
 * `VITALS`, o número grande do cartão podia vir de um balde e as barras logo
 * abaixo do outro — duas frequências de repouso no mesmo cartão.
 */

import { ONDE_MORA } from "../../lib/onde-mora-a-metrica";
import {
  PREFERENCIA_DE_BALDE,
  porDiaPreferido,
  variacao,
} from "../../mobile/src/lib/resumo-de-saude";

/** Um ponto como a rota o entrega à app. */
const ponto = (tipo: string, dia: string, campos: Record<string, number>) =>
  ({
    dataType: tipo,
    dataDate: dia,
    sleepDuration: null,
    sleepEfficiency: null,
    deepMinutes: null,
    remMinutes: null,
    hrv: null,
    restingHr: null,
    spo2: null,
    steps: null,
    activeCalories: null,
    activeMinutes: null,
    ...campos,
  }) as any;

describe("o mapa do app e o do servidor são o mesmo mapa", () => {
  it("**cada métrica que a app conhece mora onde o servidor diz**", () => {
    /*
     * Dois mapas separados divergem — foi exactamente isso que deixou a clínica
     * cega a FC de repouso, VFC e SpO2. Este teste é o que impede a segunda
     * divergência.
     */
    for (const [campo, baldes] of Object.entries(PREFERENCIA_DE_BALDE)) {
      const noServidor = ONDE_MORA[campo];
      expect(noServidor).toBeDefined();
      expect([...baldes]).toEqual([...noServidor]);
    }
  });

  it("e as métricas que a aba mostra estão nos dois", () => {
    for (const campo of ["sleepDuration", "restingHr", "hrv", "spo2", "steps"]) {
      expect(PREFERENCIA_DE_BALDE[campo]).toBeDefined();
      expect(ONDE_MORA[campo]).toBeDefined();
    }
  });

  it("**e nenhum aponta para `BODY`** — ninguém o escreve", () => {
    for (const baldes of Object.values(PREFERENCIA_DE_BALDE)) {
      expect([...baldes]).not.toContain("BODY");
    }
  });
});

describe("o mesmo dia conta uma vez, e ganha o balde preferido", () => {
  it("**a FC de repouso do sono ganha à das medições**", () => {
    /*
     * A do sono é a frequência em repouso como as palavras significam — a noite
     * inteira, deitado. A das medições é a média de quando a pessoa calhou de
     * medir.
     */
    const pontos = [
      ponto("VITALS", "2026-10-01", { restingHr: 70 }),
      ponto("SLEEP", "2026-10-01", { restingHr: 54 }),
    ];
    expect(porDiaPreferido(pontos, "restingHr")).toEqual([{ dia: "2026-10-01", valor: 54 }]);
  });

  it("**e o dia não entra duas vezes**", () => {
    // Senão a média conta esse dia a dobrar, e a variação impressa mente.
    const pontos = [
      ponto("SLEEP", "2026-10-01", { restingHr: 54 }),
      ponto("VITALS", "2026-10-01", { restingHr: 70 }),
      ponto("SLEEP", "2026-10-02", { restingHr: 55 }),
    ];
    expect(porDiaPreferido(pontos, "restingHr")).toHaveLength(2);
  });

  it("a das medições serve os dias sem noite registada", () => {
    const pontos = [
      ponto("SLEEP", "2026-10-01", { restingHr: 54 }),
      ponto("VITALS", "2026-10-02", { restingHr: 71 }),
    ];
    expect(porDiaPreferido(pontos, "restingHr").map((v) => v.valor)).toEqual([54, 71]);
  });

  it("**a variação também conta cada dia uma vez**", () => {
    /*
     * Com seis dias duplicados nos dois baldes, a série tinha doze entradas e a
     * comparação acontecia entre pedaços que atravessavam os mesmos dias.
     */
    const pontos = Array.from({ length: 6 }, (_, i) => {
      const dia = `2026-10-0${i + 1}`;
      return [
        ponto("SLEEP", dia, { restingHr: 50 + i }),
        ponto("VITALS", dia, { restingHr: 90 }),
      ];
    }).flat();

    const v = variacao(pontos, "restingHr");
    expect(v).not.toBeNull();
    /* Seis dias, dois de cada lado — e nenhum valor de `VITALS` na conta. */
    expect(v!.diasComparados).toBe(2);
    expect(v!.delta).toBeCloseTo(4, 6);
  });

  it("o SpO2 vem dos sinais vitais, e o sono do sono", () => {
    const pontos = [
      ponto("VITALS", "2026-10-01", { spo2: 98 }),
      ponto("SLEEP", "2026-10-01", { sleepDuration: 420 }),
    ];
    expect(porDiaPreferido(pontos, "spo2")).toEqual([{ dia: "2026-10-01", valor: 98 }]);
    expect(porDiaPreferido(pontos, "sleepDuration")).toEqual([{ dia: "2026-10-01", valor: 420 }]);
  });

  it("**um ponto `BODY` não dá valor nenhum**", () => {
    expect(porDiaPreferido([ponto("BODY", "2026-10-01", { restingHr: 54 })], "restingHr")).toEqual(
      []
    );
  });
});
