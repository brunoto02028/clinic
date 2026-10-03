/**
 * @jest-environment node
 *
 * A pressão cai no dia em que foi medida (120 T-3).
 *
 * ## O achado
 *
 * Em 02/10/2026 o `VITALS` passou a usar o fuso da própria medição, e o sono e a
 * actividade já usavam o `date` que a Withings manda. **A pressão ficou sozinha
 * em UTC.**
 *
 * Concreto: uma leitura às 00:30 de Londres no verão arquivava em `D−1`,
 * enquanto o sono da mesma noite arquivava em `D`. Dois gráficos lado a lado no
 * mesmo papel, com a mesma noite em dias diferentes — num documento onde a
 * direcção da pressão é o item em que errar não é aceitável.
 *
 * A causa não era uma linha: `BloodPressureReading` não tinha coluna de fuso, e
 * o `withingsBloodPressure` **descartava** o `group.timezone` que vem na mesma
 * resposta do `getmeas`.
 *
 * ## O que não pode mudar
 *
 * Nenhum dado existente muda de dia. Leituras sem fuso — as antigas e as
 * digitadas à mão — continuam em UTC.
 */

import { pressaoPorDia } from "@/lib/patient-monitoring";
import { diaNoFuso, diaDaMedicao } from "@/lib/dia-da-medicao";

/** 00:30 de 2 de Outubro em Londres (BST). Em UTC ainda é dia 1. */
const MEIA_NOITE_E_MEIA_EM_LONDRES = "2026-10-01T23:30:00.000Z";

describe("a conta do dia é uma só", () => {
  it("**com fuso, o dia é o de lá**", () => {
    expect(diaNoFuso(MEIA_NOITE_E_MEIA_EM_LONDRES, "Europe/London")).toBe("2026-10-02");
  });

  it("**sem fuso, é UTC** — e nenhum dado existente muda de dia", () => {
    expect(diaNoFuso(MEIA_NOITE_E_MEIA_EM_LONDRES, null)).toBe("2026-10-01");
    expect(diaNoFuso(MEIA_NOITE_E_MEIA_EM_LONDRES, undefined)).toBe("2026-10-01");
    expect(diaNoFuso(MEIA_NOITE_E_MEIA_EM_LONDRES, "")).toBe("2026-10-01");
    expect(diaNoFuso(MEIA_NOITE_E_MEIA_EM_LONDRES, "   ")).toBe("2026-10-01");
  });

  it("um fuso a oeste empurra para trás", () => {
    expect(diaNoFuso("2026-10-02T02:00:00.000Z", "America/Sao_Paulo")).toBe("2026-10-01");
  });

  it("**um fuso que o runtime não conhece não derruba nada**", () => {
    /* Cai em UTC, que é o comportamento anterior — nunca uma excepção. */
    expect(diaNoFuso(MEIA_NOITE_E_MEIA_EM_LONDRES, "Marte/Olympus")).toBe("2026-10-01");
  });

  it("e uma data ilegível é `null`, não uma data inventada", () => {
    expect(diaNoFuso("não é data", "Europe/London")).toBeNull();
    expect(diaNoFuso(null)).toBeNull();
    expect(diaNoFuso(undefined)).toBeNull();
  });

  it("o atalho para quem já tem a medição em mãos dá o mesmo", () => {
    expect(
      diaDaMedicao({ measuredAt: MEIA_NOITE_E_MEIA_EM_LONDRES, timezone: "Europe/London" })
    ).toBe("2026-10-02");
  });
});

describe("a série diária da pressão segue o fuso", () => {
  it("**a leitura da madrugada de Londres fica no dia de Londres**", () => {
    const serie = pressaoPorDia(
      [{ systolic: 128, diastolic: 80, measuredAt: MEIA_NOITE_E_MEIA_EM_LONDRES, timezone: "Europe/London" }],
      "systolic"
    );
    expect(serie).toEqual([{ dia: "2026-10-02", valor: 128 }]);
  });

  it("**a mesma leitura sem fuso continua no dia UTC**", () => {
    const serie = pressaoPorDia(
      [{ systolic: 128, diastolic: 80, measuredAt: MEIA_NOITE_E_MEIA_EM_LONDRES }],
      "systolic"
    );
    expect(serie).toEqual([{ dia: "2026-10-01", valor: 128 }]);
  });

  it("**três medições num dia são um ponto, não três** — e o dia é o de lá", () => {
    /*
     * O dia diligente não pode pesar três vezes: a linha diria que a pressão
     * subiu quando o que subiu foi o cuidado.
     */
    const serie = pressaoPorDia(
      [
        { systolic: 150, diastolic: 95, measuredAt: "2026-10-01T23:30:00Z", timezone: "Europe/London" },
        { systolic: 140, diastolic: 90, measuredAt: "2026-10-02T07:00:00Z", timezone: "Europe/London" },
        { systolic: 130, diastolic: 85, measuredAt: "2026-10-02T12:00:00Z", timezone: "Europe/London" },
        { systolic: 110, diastolic: 70, measuredAt: "2026-10-04T09:00:00Z", timezone: "Europe/London" },
      ],
      "systolic"
    );
    expect(serie).toEqual([
      { dia: "2026-10-02", valor: 140 },
      { dia: "2026-10-04", valor: 110 },
    ]);
  });

  it("leituras de fusos diferentes no mesmo dia local juntam-se", () => {
    const serie = pressaoPorDia(
      [
        { systolic: 120, diastolic: 80, measuredAt: "2026-10-02T08:00:00Z", timezone: "Europe/London" },
        { systolic: 130, diastolic: 85, measuredAt: "2026-10-02T20:00:00Z", timezone: "America/Sao_Paulo" },
      ],
      "systolic"
    );
    expect(serie).toEqual([{ dia: "2026-10-02", valor: 125 }]);
  });

  it("**e uma sistólica em falta não vira 0 mmHg**", () => {
    /* `Number(null)` é `0`, e 0 mmHg não é a pressão de ninguém. */
    const serie = pressaoPorDia(
      [
        { systolic: null, diastolic: 80, measuredAt: "2026-10-02T08:00:00Z", timezone: "Europe/London" },
        { systolic: 120, diastolic: 80, measuredAt: "2026-10-02T09:00:00Z", timezone: "Europe/London" },
      ],
      "systolic"
    );
    expect(serie).toEqual([{ dia: "2026-10-02", valor: 120 }]);
  });

  it("uma medição com data ilegível não entra, e não derruba a série", () => {
    const serie = pressaoPorDia(
      [
        { systolic: 120, diastolic: 80, measuredAt: "não é data", timezone: "Europe/London" },
        { systolic: 118, diastolic: 78, measuredAt: "2026-10-02T09:00:00Z", timezone: "Europe/London" },
      ],
      "systolic"
    );
    expect(serie).toEqual([{ dia: "2026-10-02", valor: 118 }]);
  });
});

describe("a pressão e o sono da mesma noite caem no mesmo dia", () => {
  it("**é esta a razão de a tarefa existir**", () => {
    /*
     * O sono vem com o `date` que a Withings manda — já no fuso de quem mediu —,
     * e os vitais passam pelo `diaDaMedicao`. A pressão era a única em UTC.
     */
    const diaDaPressao = pressaoPorDia(
      [{ systolic: 128, diastolic: 80, measuredAt: MEIA_NOITE_E_MEIA_EM_LONDRES, timezone: "Europe/London" }],
      "systolic"
    )[0].dia;

    /* O que o `VITALS` faria com a mesma medição. */
    const diaDosVitais = diaDaMedicao({
      measuredAt: MEIA_NOITE_E_MEIA_EM_LONDRES,
      timezone: "Europe/London",
    });

    /* E o que a Withings manda para o sono dessa noite. */
    const diaDoSono = "2026-10-02";

    expect(diaDaPressao).toBe(diaDosVitais);
    expect(diaDaPressao).toBe(diaDoSono);
  });
});
