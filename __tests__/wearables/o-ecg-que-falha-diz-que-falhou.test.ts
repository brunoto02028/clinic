/**
 * @jest-environment node
 *
 * Uma falha no ECG diz **"ECG"** (120 T-4).
 *
 * ## O achado
 *
 * O ECG era buscado dentro do `try` dos sinais vitais, cujo `catch` escrevia:
 *
 * ```
 * console.error("[withings-ingest] vitals failed:", e?.message);
 * ```
 *
 * Em 02/10 o `withingsEcg` passou a **relançar** em vez de devolver `[]` —
 * correcto —, mas o `throw` subia para esse `catch`: o ECG falhava, o log
 * falava de sinais vitais, e a sincronização contava-se como bem sucedida.
 *
 * Agravante: a condição de pedir o sinal é *"ainda não tenho o sinal"*. Uma
 * falha engolida faz a ingestão pedir outra vez, a cada passagem, para sempre,
 * calada — e ninguém lê um log que nomeia a coisa errada.
 */

const falhar = { vitais: false, ecg: false };

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(async () => ({ clinicId: "c1" })) },
    /*
     * O `upsertPoint` pergunta primeiro (`findFirst`) e só depois escreve — a
     * forma que o código realmente usa. Um mock com só `upsert` fazia os seis
     * testes morrerem no sítio errado, e um mock que não é um estado que o banco
     * produz é o defeito que já ensinou três bugs a sobreviver nesta base.
     */
    wearableDataPoint: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async () => ({ id: "x" })),
      update: jest.fn(async () => ({ id: "x" })),
      upsert: jest.fn(async () => ({ id: "x" })),
    },
    wearableConnection: { update: jest.fn(async () => ({})) },
    bloodPressureReading: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    ecgRecording: { upsert: jest.fn(async () => ({ id: "e1" })), update: jest.fn(async () => ({})) },
  },
}));

jest.mock("@/lib/withings", () => ({
  withingsAccessToken: jest.fn(async () => "tok"),
  withingsBloodPressure: jest.fn(async () => []),
  withingsActivity: jest.fn(async () => [
    { dataDate: "2026-10-02", steps: 3000, activeMinutes: 20, activeCalories: 100, totalCalories: 1800 },
  ]),
  withingsSleep: jest.fn(async () => [
    {
      dataDate: "2026-10-02",
      sleepDuration: 420,
      deepMinutes: 116,
      remMinutes: 60,
      lightMinutes: 150,
      awakeMinutes: 10,
      hrv: 14.5,
      restingHr: 55,
    },
  ]),
}));

jest.mock("@/lib/withings-vitals", () => ({
  withingsVitals: jest.fn(async () => {
    if (falhar.vitais) throw new Error("getmeas em baixo");
    return [];
  }),
  vitalsByDay: jest.fn(() => []),
  withingsEcg: jest.fn(async () => {
    if (falhar.ecg) throw new Error("heart list em baixo");
    return [];
  }),
}));

jest.mock("@/lib/withings-routing", () => ({ ignoraPressao: jest.fn(() => false) }));
jest.mock("@/lib/ecg-tem-sinal", () => ({ temTracadoPorGravacao: jest.fn(async () => true) }));
jest.mock("@/lib/withings-series", () => ({
  intradayDoDia: jest.fn(async () => null),
  hipnogramaDaNoite: jest.fn(async () => null),
  treinosDoPeriodo: jest.fn(async () => []),
  sinalDoEcg: jest.fn(async () => ({ amostras: [], bruto: {} })),
}));

import { ingestWithings } from "@/lib/withings-ingest";

const ligacao = {
  id: "conn1",
  provider: "WITHINGS",
  accessToken: "a",
  refreshToken: "r",
  expiresAt: new Date(Date.now() + 3600_000),
  isClinicDevice: false,
} as any;

let erros: string[] = [];
beforeEach(() => {
  falhar.vitais = false;
  falhar.ecg = false;
  erros = [];
  jest.spyOn(console, "error").mockImplementation((...a: any[]) => {
    erros.push(a.map(String).join(" "));
  });
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  (console.error as any).mockRestore?.();
  (console.log as any).mockRestore?.();
});

/** Só os `kinds` que interessam, para o teste não depender do resto. */
const correr = () =>
  ingestWithings("u1", ligacao, { kinds: ["activity", "sleep", "vitals"] });

describe("as duas falhas têm dois nomes", () => {
  it("**tudo bem → nada em `falhas`**", async () => {
    const r = await correr();
    expect(r.falhas).toEqual([]);
  });

  it("**o ECG a falhar nomeia o ECG**, e não os vitais", async () => {
    falhar.ecg = true;
    const r = await correr();
    expect(r.falhas).toEqual(["ecg"]);
    const log = erros.join("\n");
    expect(log).toMatch(/ECG/);
    expect(log).not.toMatch(/vitais falharam/);
  });

  it("**os vitais a falhar nomeiam os vitais**", async () => {
    falhar.vitais = true;
    const r = await correr();
    expect(r.falhas).toEqual(["vitais"]);
    expect(erros.join("\n")).toMatch(/vitais/);
  });

  it("**os dois a falhar dão dois nomes**", async () => {
    falhar.vitais = true;
    falhar.ecg = true;
    const r = await correr();
    expect(r.falhas.sort()).toEqual(["ecg", "vitais"]);
  });

  it("**e o ECG a falhar não custa ao paciente o sono e a actividade**", async () => {
    /*
     * Esta parte do comentário antigo estava certa e fica: uma conta sem uma
     * destas medidas não pode perder as outras, que já estão guardadas a esta
     * altura.
     */
    falhar.ecg = true;
    const r = await correr();
    expect(r.sleepNights).toBe(1);
    expect(r.activityDays).toBe(1);
  });

  it("e os vitais a falhar não impedem o ECG de ser lido", async () => {
    /*
     * A outra direcção da separação. Antes, um `getmeas` em baixo saltava para
     * o `catch` e o bloco do ECG **nunca corria** — a gravação não entrava, e
     * a razão disso aparecia no log como se fosse dos vitais.
     */
    falhar.vitais = true;
    const { withingsEcg } = require("@/lib/withings-vitals");
    await correr();
    expect(withingsEcg).toHaveBeenCalled();
  });
});
