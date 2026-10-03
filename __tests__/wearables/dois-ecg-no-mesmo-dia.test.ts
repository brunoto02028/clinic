/**
 * @jest-environment node
 *
 * Dois ECG no mesmo dia são dois (119 T-2/T-3).
 *
 * ## O defeito, com nome e hora
 *
 * O ECG era guardado no `WearableDataPoint`, cuja chave é
 * `(utilizador, dia, tipo, provedor)`. Essa é a chave de um **total do dia** —
 * passos, calorias, minutos activos. Um ECG não é um total: é um **evento**, e
 * uma pessoa faz quantos quiser.
 *
 * Em 01/10/2026 o Bruno gravou dois, às **22:44** e às **23:54**, os dois
 * classificados *Normal* pelo relógio. O `upsertPoint` encontrou a linha do dia
 * e fez `update`: o segundo apagou o primeiro. E o pior não é a perda — é que
 * não ficava buraco nenhum. Ficava um registo perfeitamente plausível, e só se
 * descobriu porque ele foi ver no app da Withings.
 *
 * ## E o dia era de quem?
 *
 * A mesma linha fazia `recordedAt.toISOString().split("T")[0]` — o dia **em
 * UTC**. Um ECG às 00:30 em Londres no verão ficava guardado como sendo do dia
 * anterior. Agora guarda-se o instante, e o dia sai no fuso de quem lê.
 */

import {
  agruparPorDia,
  diaLocalDe,
  horaLocalDe,
  ehAchado,
  FRASE_DA_CONCLUSAO,
  RegistoDeEcg,
} from "../../mobile/src/lib/ecg-lista";

const reg = (
  id: string,
  recordedAt: string,
  conclusao: RegistoDeEcg["conclusao"] = "normal",
  heartRate: number | null = 63
): RegistoDeEcg => ({ id, recordedAt, heartRate, conclusao, signalId: null });

/** Os dois do Bruno, em UTC — 22:44 e 23:54 de 1 de outubro. */
const asDuasDoBruno = [
  reg("b", "2026-10-01T23:54:00.000Z", "normal", 63),
  reg("a", "2026-10-01T22:44:00.000Z", "normal", 78),
];

describe("duas gravações no mesmo dia", () => {
  it("**continuam a ser duas**", () => {
    const dias = agruparPorDia(asDuasDoBruno, "2026-10-02");
    expect(dias).toHaveLength(1);
    expect(dias[0].registos).toHaveLength(2);
  });

  it("e aparecem da mais recente para a mais antiga", () => {
    const dias = agruparPorDia(asDuasDoBruno, "2026-10-02");
    expect(dias[0].registos.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("**a ordem não depende de quem chama**", () => {
    // Um agrupador que herde a ordem da lista que recebe é um agrupador que um
    // dia mostra tudo ao contrário sem ninguém perceber porquê.
    const aoContrario = [...asDuasDoBruno].reverse();
    const dias = agruparPorDia(aoContrario, "2026-10-02");
    expect(dias[0].registos.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("cada uma mantém a sua frequência", () => {
    const dias = agruparPorDia(asDuasDoBruno, "2026-10-02");
    expect(dias[0].registos.map((r) => r.heartRate)).toEqual([63, 78]);
  });

  it("dias diferentes são grupos diferentes, do mais recente para trás", () => {
    const dias = agruparPorDia(
      [
        reg("x", "2026-09-28T10:00:00.000Z"),
        reg("y", "2026-10-01T10:00:00.000Z"),
        reg("z", "2026-10-02T10:00:00.000Z"),
      ],
      "2026-10-02"
    );
    expect(dias.map((d) => d.registos[0].id)).toEqual(["z", "y", "x"]);
    expect(dias.map((d) => d.diasAtras)).toEqual([0, 1, 4]);
  });

  it("um instante ilegível não inventa um dia", () => {
    expect(agruparPorDia([reg("mau", "nao e uma data")], "2026-10-02")).toEqual([]);
    expect(diaLocalDe("nao e uma data")).toBeNull();
    expect(horaLocalDe("nao e uma data")).toBeNull();
  });

  it("sem registos, sem grupos", () => {
    expect(agruparPorDia([], "2026-10-02")).toEqual([]);
  });
});

describe("a hora, que é o que distingue as duas", () => {
  it("**é escrita com dois dígitos**, como num relógio", () => {
    // Sob `TZ=UTC` no jest, a hora local é a de UTC — é a conversão e o
    // formato que estão a ser medidos aqui, não o fuso.
    expect(horaLocalDe("2026-10-01T22:44:00.000Z")).toBe("22:44");
    expect(horaLocalDe("2026-10-01T09:05:00.000Z")).toBe("09:05");
    expect(horaLocalDe("2026-10-01T00:00:00.000Z")).toBe("00:00");
  });

  it("e o dia também", () => {
    expect(diaLocalDe("2026-01-02T10:00:00.000Z")).toBe("2026-01-02");
  });
});

describe("o que a tela diz de cada registo", () => {
  it("**nunca chama 'normal' ao que o aparelho não assinalou**", () => {
    // Regra da tela do paciente desde o QA da 099 T-8: nem "normal", nem
    // "alterado". Dizer o que o aparelho não assinalou é relato.
    expect(FRASE_DA_CONCLUSAO.normal.en).toBe("flagged nothing");
    expect(FRASE_DA_CONCLUSAO.normal.en.toLowerCase()).not.toContain("normal");
    expect(FRASE_DA_CONCLUSAO.normal.pt.toLowerCase()).not.toContain("normal");
  });

  it("**a fibrilhação é nomeada**, e não diluída num inconclusivo", () => {
    expect(FRASE_DA_CONCLUSAO.fibrilacao.en).toMatch(/atrial fibrillation/i);
    expect(FRASE_DA_CONCLUSAO.fibrilacao.pt).toMatch(/fibrilh?ação atrial/i);
  });

  it("**as três frases deixam o sujeito de fora** — quem concluiu decide-se por registo", () => {
    /*
     * Isto exigia o contrário: que as três dissessem *"o relógio"*. Deixou de
     * poder ser, e a razão está na 122 T-9 — desde que a clínica atribui ECG a
     * pacientes, o mesmo texto aparecia a quem pode nem ter relógio.
     *
     * A conclusão continua a ser **do aparelho** e não nossa, que era o ponto
     * desta asserção; o que mudou foi que o sujeito passou a ser escolhido em
     * `fraseDaConclusao`, por quem mediu.
     */
    for (const k of ["normal", "fibrilacao", "inconclusivo"] as const) {
      expect(FRASE_DA_CONCLUSAO[k].en.toLowerCase()).not.toContain("watch");
      expect(FRASE_DA_CONCLUSAO[k].pt.toLowerCase()).not.toContain("relógio");
      /* E continuam a ser relato: começam por um verbo, sem sujeito nenhum. */
      expect(FRASE_DA_CONCLUSAO[k].en).toMatch(/^[a-z]/);
    }
  });

  it("**só a fibrilhação muda a cor**", () => {
    // Pintar o inconclusivo de vermelho é alarmar por um registo que o relógio
    // apenas não conseguiu classificar.
    expect(ehAchado("fibrilacao")).toBe(true);
    expect(ehAchado("normal")).toBe(false);
    expect(ehAchado("inconclusivo")).toBe(false);
  });
});
