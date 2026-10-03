/**
 * @jest-environment node
 *
 * Um campo fora do `select` apagou o filtro de uma consulta (achado do QA, 03/10).
 *
 * ## O defeito
 *
 * A rota do "Já medi" passou a contar os ECG **deste paciente** nesta janela,
 * para a tela deixar de dizer *"nada veio do aparelho"* a quem acabou de gravar
 * um. A consulta era:
 *
 * ```ts
 * count({ where: { userId: session.patientId, ... } })
 * ```
 *
 * E o `select` da sessão, três linhas acima, **não pedia `patientId`**.
 *
 * O Prisma **ignora** um campo `undefined` num `where` em vez de não casar
 * nada. O filtro desapareceu, e a contagem passou a varrer a tabela inteira —
 * gravações de pacientes de **outras clínicas** incluídas. A frase que saía era
 * *"um ECG foi salvo neste histórico"* sobre uma ficha sem ECG nenhum, e é por
 * ela que o terapeuta decide não repetir a medição.
 *
 * ## Porque os testes não o apanharam
 *
 * Porque os que guardam esta rota leem-na **como texto**: casam a grafia do
 * `kinds` e do `select` da resposta, e nunca a executam. E um mock que devolve
 * um objecto completo, ignorando o `select` que lhe passaram, é um estado que o
 * banco **nunca produz** — é a terceira vez que isso deixa um defeito passar
 * nesta base.
 *
 * Por isso o mock daqui **aplica o `select`**: devolve só os campos pedidos.
 * Com `patientId` fora da lista, o teste fica vermelho.
 */

const SESSAO = {
  id: "s1",
  clinicId: "c1",
  patientId: "pac1",
  status: "OPEN",
  openedAt: new Date("2026-10-04T09:00:00.000Z"),
  expiresAt: new Date("2026-10-04T09:03:00.000Z"),
  connectionId: "conn1",
  patient: { firstName: "Ana", lastName: "Teste" },
  reading: null,
};

/** Devolve **só** o que o `select` pediu, como o banco faz. */
const comoOBancoDevolve = (select: Record<string, any> | undefined, linha: any) => {
  if (!select) return linha;
  const out: any = {};
  for (const [campo, pedido] of Object.entries(select)) {
    if (!pedido) continue;
    out[campo] = linha[campo];
  }
  return out;
};

const contarEcg = jest.fn(async () => 1);

jest.mock("@/lib/db", () => ({
  prisma: {
    clinicMeasurementSession: {
      findUnique: jest.fn(async ({ select }: any) => comoOBancoDevolve(select, SESSAO)),
    },
    wearableConnection: {
      findUnique: jest.fn(async () => ({
        id: "conn1",
        userId: "staff1",
        status: "CONNECTED",
        accessToken: "a",
        refreshToken: "r",
        isClinicDevice: true,
        clinicId: "c1",
        providerUserId: "w1",
      })),
    },
    ecgRecording: { count: (...a: any[]) => contarEcg(...(a as [])) },
  },
}));
jest.mock("@/lib/tenant-access", () => ({
  getSessionStaffActor: jest.fn(async () => ({ id: "staff1", clinicId: "c1" })),
}));
jest.mock("@/lib/clinic-device", () => ({ expireStaleSessions: jest.fn(async () => 0) }));
jest.mock("@/lib/withings-ingest", () => ({
  ingestWithings: jest.fn(async () => ({
    bloodPressure: 0,
    bloodPressureRead: 0,
    activityDays: 0,
    sleepNights: 0,
    vitalsDays: 0,
    ecgRecords: 1,
    ecgRead: 1,
    ecgNaoAtribuidos: 0,
    vitalReadings: 2,
    vitaisNaoAtribuidos: 0,
    intradayDays: 0,
    hypnogramNights: 0,
    workouts: 0,
    falhas: [],
  })),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/measurement-sessions/[id]/fetch/route";

const chamar = () =>
  POST(
    new NextRequest("https://bpr.clinic/api/admin/measurement-sessions/s1/fetch", {
      method: "POST",
    }),
    { params: { id: "s1" } } as any
  );

beforeEach(() => {
  contarEcg.mockClear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  (console.error as any).mockRestore?.();
});

describe("a contagem de ECG é de um paciente, não da tabela", () => {
  it("**o `userId` da consulta está definido e é o da janela**", async () => {
    await chamar();

    expect(contarEcg).toHaveBeenCalledTimes(1);
    const where = (contarEcg.mock.calls[0] as any)[0].where;
    expect(where.userId).toBe("pac1");
    /*
     * A asserção que apanha o defeito: `undefined` aqui não é "ninguém", é
     * **toda a gente**.
     */
    expect(where.userId).toBeDefined();
  });

  it("**e a janela é lida com o paciente** — senão o filtro nasce `undefined`", async () => {
    await chamar();
    const { prisma } = require("@/lib/db");
    const select = prisma.clinicMeasurementSession.findUnique.mock.calls[0][0].select;
    expect(select.patientId).toBe(true);
  });

  it("**a resposta conta o que é dele**", async () => {
    const r: any = await chamar();
    const body = await r.json();
    expect(body.ecg).toBe(1);
  });

  it("**a resposta diz também quantos vitais entraram** — e a tela soma as frases", async () => {
    /*
     * Sem isto, medir **só a temperatura** guardava o `VitalReading` na ficha e
     * a tela respondia *"nada veio do aparelho"*: `found` só olha a pressão e
     * `ecg` só olha o ECG. O terapeuta mede outra vez, ou anota à mão.
     *
     * É a **terceira** vez que este defeito aparece nesta tela — `lidas` em
     * 27/09, `ecg` na 122 T-2, vitais agora. Daí a asserção sobre a tela ao
     * lado da asserção sobre a rota.
     */
    const r: any = await chamar();
    const body = await r.json();
    expect(body.vitais).toBe(2);

    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    const tela = readFileSync(
      join(__dirname, "..", "..", "components", "admin", "clinic-measurement-button.tsx"),
      "utf8"
    );
    expect(tela).toMatch(/if \(data\?\.vitais > 0\) partes\.push\(ui\.fetchedVitais\(data\.vitais\)\)/);
    expect(tela).toMatch(/fetchedVitais: \(n: number\) =>/);
    expect(tela).toMatch(/medições \(temperatura \/ SpO₂\) foram salvas neste histórico/);
  });

  it("**e a contagem é limitada à janela**, não ao histórico todo", async () => {
    await chamar();
    const where = (contarEcg.mock.calls[0] as any)[0].where;
    expect(where.recordedAt?.gte).toBeInstanceOf(Date);
    expect(where.recordedAt?.lte).toBeInstanceOf(Date);
    expect(where.provider).toBe("WITHINGS");
  });
});
