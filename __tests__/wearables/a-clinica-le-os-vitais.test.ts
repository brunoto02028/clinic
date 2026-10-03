/**
 * @jest-environment node
 *
 * A ligação da clínica **pede** os vitais, e eles vão pela atribuição (122 T-3).
 *
 * A regra de quem recebe o quê está provada em
 * `cada-paciente-recebe-a-sua-medicao.test.ts`, sobre a função pura. Este
 * arquivo prova a outra metade, que nenhuma mutação matava: que a ingestão da
 * **clínica** chega a chamá-la.
 *
 * Sem isto, reverter `wanted` para `["bp", "ecg"]` não matava teste nenhum — a
 * temperatura e o SpO₂ do paciente voltavam a não entrar em lado nenhum, com a
 * suíte inteira verde.
 */

const criados: any[] = [];
const pontosDoDia: any[] = [];
const janelasNoBanco: { rows: any[] } = { rows: [] };
const vitaisDoProvedor: { rows: any[] } = { rows: [] };

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(async () => ({ clinicId: "c1" })) },
    wearableConnection: {
      update: jest.fn(async () => ({})),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
    },
    wearableDataPoint: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => {
        pontosDoDia.push(data);
        return { id: "p1" };
      }),
      update: jest.fn(async () => ({ id: "p1" })),
    },
    bloodPressureReading: { findFirst: jest.fn(async () => null), create: jest.fn(async () => ({})) },
    clinicMeasurementSession: {
      findMany: jest.fn(async () => janelasNoBanco.rows),
      update: jest.fn(async () => ({})),
    },
    vitalReading: {
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => {
        criados.push(data);
        return { id: `v${criados.length}` };
      }),
    },
    ecgRecording: { upsert: jest.fn(async () => ({ id: "e1" })), findFirst: jest.fn(async () => null) },
  },
}));
jest.mock("@/lib/system-logger", () => ({ logAudit: jest.fn(async () => undefined) }));
jest.mock("@/lib/withings", () => ({
  withingsAccessToken: jest.fn(async () => "tok"),
  withingsBloodPressure: jest.fn(async () => []),
  withingsActivity: jest.fn(async () => []),
  withingsSleep: jest.fn(async () => []),
}));
jest.mock("@/lib/withings-vitals", () => ({
  withingsVitals: jest.fn(async () => vitaisDoProvedor.rows),
  vitalsByDay: jest.fn((lista: any[]) =>
    lista.length ? [{ dataDate: "2026-10-04", spo2: 97, samples: lista.length }] : []
  ),
  withingsEcg: jest.fn(async () => []),
}));
jest.mock("@/lib/ecg-tem-sinal", () => ({ temTracadoPorGravacao: jest.fn(async () => true) }));
jest.mock("@/lib/withings-series", () => ({
  intradayDoDia: jest.fn(async () => null),
  hipnogramaDaNoite: jest.fn(async () => null),
  treinosDoPeriodo: jest.fn(async () => []),
  sinalDoEcg: jest.fn(async () => ({ amostras: [], bruto: {} })),
}));

import { ingestWithings } from "@/lib/withings-ingest";

const ligacao = (extra: Record<string, unknown>) =>
  ({
    id: "conn1",
    provider: "WITHINGS",
    accessToken: "a",
    refreshToken: "r",
    providerUserId: "w1",
    expiresAt: new Date(Date.now() + 3600_000),
    ...extra,
  }) as any;

const QUANDO = new Date("2026-10-04T09:01:00.000Z");

const janelaDaAna = {
  id: "s1",
  status: "OPEN",
  patientId: "pac-ana",
  openedById: "staff1",
  context: "PRE_SESSION",
  openedAt: new Date("2026-10-04T09:00:00.000Z"),
  expiresAt: new Date("2026-10-04T09:03:00.000Z"),
};

beforeEach(() => {
  criados.length = 0;
  pontosDoDia.length = 0;
  janelasNoBanco.rows = [];
  vitaisDoProvedor.rows = [];
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  (console.log as any).mockRestore?.();
  (console.error as any).mockRestore?.();
});

describe("a ligação da clínica lê vitais e atribui-os", () => {
  it("**um SpO₂ dentro da janela entra no prontuário do paciente**", async () => {
    janelasNoBanco.rows = [janelaDaAna];
    vitaisDoProvedor.rows = [{ measuredAt: QUANDO, measureId: "g1", spo2: 96, heartRate: 70 }];

    const r = await ingestWithings(
      "staff1",
      ligacao({ isClinicDevice: true, clinicId: "c1" }),
      { kinds: ["vitals"] }
    );

    expect(criados).toHaveLength(1);
    expect(criados[0]).toMatchObject({ patientId: "pac-ana", spo2: 96, clinicId: "c1" });
    expect(r.vitalReadings).toBe(1);
    /* E **não** foi para o total do dia de ninguém. */
    expect(pontosDoDia).toHaveLength(0);
  });

  it("**fora da janela não entra, e é contado**", async () => {
    vitaisDoProvedor.rows = [{ measuredAt: QUANDO, measureId: "g1", spo2: 96 }];

    const r = await ingestWithings(
      "staff1",
      ligacao({ isClinicDevice: true, clinicId: "c1" }),
      { kinds: ["vitals"] }
    );

    expect(criados).toHaveLength(0);
    expect(r.vitalReadings).toBe(0);
    expect(r.vitaisNaoAtribuidos).toBe(1);
  });

  it("**a ligação pessoal continua a escrever o total do dia do dono**", async () => {
    /*
     * As duas formas de dado continuam a existir, e cada uma no seu sítio: o
     * acto da clínica numa linha própria, o dia do dono no balde de sempre.
     */
    vitaisDoProvedor.rows = [{ measuredAt: QUANDO, measureId: "g1", spo2: 96 }];

    const r = await ingestWithings("u1", ligacao({ isClinicDevice: false, clinicId: "c1" }), {
      kinds: ["vitals"],
    });

    expect(criados).toHaveLength(0);
    expect(pontosDoDia).toHaveLength(1);
    expect(pontosDoDia[0]).toMatchObject({ userId: "u1", dataType: "VITALS" });
    expect(r.vitalsDays).toBe(1);
  });

  it("**e uma FC solta na clínica não vira medição de ninguém**", async () => {
    janelasNoBanco.rows = [janelaDaAna];
    vitaisDoProvedor.rows = [{ measuredAt: QUANDO, measureId: "g1", heartRate: 58 }];

    const r = await ingestWithings(
      "staff1",
      ligacao({ isClinicDevice: true, clinicId: "c1" }),
      { kinds: ["vitals"] }
    );

    expect(criados).toHaveLength(0);
    expect(r.vitaisNaoAtribuidos).toBe(1);
  });
});
