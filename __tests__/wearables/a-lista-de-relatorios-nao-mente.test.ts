/**
 * @jest-environment node
 *
 * *"Ainda não há relatórios"* tem de querer dizer isso (120 T-1).
 *
 * `app/api/patient/reports/route.ts` fazia `.catch(() => [])` na lista. Uma
 * falha de banco e um paciente sem relatórios produziam **a mesma resposta** —
 * e a tela escrevia *"ainda não há relatórios"* sobre uma lista que podia ter
 * dez.
 *
 * É a ausência silenciosa no sítio mais visível: a pessoa pediu um relatório,
 * ele existe, e o app diz que não existe nenhum.
 */

const gate = { response: null as any, gate: { userId: "p1" } as any };

jest.mock("@/lib/patient-gate", () => ({
  patientGate: jest.fn(async () => gate),
}));
jest.mock("@/lib/file-access-token", () => ({
  signFileToken: jest.fn(() => "tok"),
}));
jest.mock("@/lib/patient-only-write", () => ({
  patientOnlyWriteRefusal: jest.fn(() => null),
}));
jest.mock("@/lib/db", () => ({
  prisma: { patientReport: { findMany: jest.fn() } },
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/patient/reports/route";

const lista = () => (prisma as any).patientReport.findMany as jest.Mock;

beforeEach(() => {
  lista().mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  (console.error as any).mockRestore?.();
});

describe("vazio e falha são respostas diferentes", () => {
  it("**sem relatórios → 200 e lista vazia**", async () => {
    lista().mockResolvedValue([]);
    const r = await GET();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ reports: [] });
  });

  it("**banco em baixo → 503**, e não uma lista vazia", async () => {
    lista().mockRejectedValue(new Error("connection refused"));
    const r = await GET();
    expect(r.status).toBe(503);
    const corpo = await r.json();
    expect(corpo.code).toBe("reports_unavailable");
    /* E não traz `reports`: a tela não tem como o confundir com vazio. */
    expect(corpo.reports).toBeUndefined();
  });

  it("com relatórios → 200 e cada um com o seu link", async () => {
    lista().mockResolvedValue([
      {
        id: "r1",
        cadence: "ON_DEMAND",
        periodStart: new Date("2026-07-04T00:00:00Z"),
        periodEnd: new Date("2026-10-02T00:00:00Z"),
        createdAt: new Date("2026-10-02T19:00:00Z"),
        therapistNote: null,
      },
    ]);
    const r = await GET();
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.reports).toHaveLength(1);
    expect(corpo.reports[0].url).toContain("/api/patient/reports/r1?t=");
  });
});

describe("a ordem é a de criação, e não a do período", () => {
  it("**o relatório recém-pedido fica no topo** (120 T-7)", async () => {
    /*
     * Ordenava por `periodStart`. Um relatório a pedido cobre 90 dias por
     * omissão, logo o `periodStart` dele é de há três meses — e um semanal
     * gerado há duas semanas tem `periodStart` mais recente. A lista punha o
     * semanal **antes** do que a pessoa acabou de pedir, e não ver o resultado
     * no topo lê-se como *"não funcionou"*.
     */
    lista().mockResolvedValue([]);
    await GET();
    expect(lista().mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  it("e continua a pedir o período, que é o que diz de quando é o papel", async () => {
    lista().mockResolvedValue([]);
    await GET();
    const select = lista().mock.calls[0][0].select;
    expect(select.periodStart).toBe(true);
    expect(select.periodEnd).toBe(true);
  });

  it("e só os que têm dado — um relatório a dizer 'nada' é pior do que nenhum", async () => {
    lista().mockResolvedValue([]);
    await GET();
    expect(lista().mock.calls[0][0].where).toMatchObject({ hasData: true });
  });
});
