/**
 * @jest-environment node
 *
 * O pacote que contava sessões no papel.
 *
 * `sessionsUsed` existia e ninguém incrementava — um pacote de dez não
 * limitava nada, e o paciente podia marcar trinta. A conta agora sai das
 * consultas ligadas ao pacote, porque um contador solto não sabe qual consulta
 * gastou qual sessão: cancelar não teria como devolver.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    patientPackage: { findMany: jest.fn(), update: jest.fn() },
    appointment: { count: jest.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { activePackageFor, syncSessionsUsed } from "@/lib/package-sessions";

const pacotes = (prisma as any).patientPackage;
const consultas = (prisma as any).appointment;

const pacote = (id: string, incluidas: number | null, usadas: number) => ({
  id,
  package: { sessionsIncluded: incluidas },
  appointments: Array.from({ length: usadas }, (_, i) => ({ id: `${id}-a${i}` })),
});

beforeEach(() => {
  jest.clearAllMocks();
  pacotes.update.mockResolvedValue({});
});

describe("activePackageFor", () => {
  it("oferece sessão enquanto sobra", async () => {
    pacotes.findMany.mockResolvedValue([pacote("p1", 10, 4)]);

    const r = await activePackageFor("paciente", "clinica");

    expect(r).toEqual({
      patientPackageId: "p1",
      included: 10,
      used: 4,
      remaining: 6,
      hasSession: true,
    });
  });

  it("pacote esgotado não oferece — a 11ª de dez não é sessão de pacote", async () => {
    pacotes.findMany.mockResolvedValue([pacote("p1", 10, 10)]);

    expect(await activePackageFor("paciente", "clinica")).toBeNull();
  });

  it("pacote ilimitado sempre tem", async () => {
    pacotes.findMany.mockResolvedValue([pacote("p1", null, 99)]);

    const r = await activePackageFor("paciente", "clinica");
    expect(r?.hasSession).toBe(true);
    expect(r?.remaining).toBeNull();
  });

  it("usa o mais antigo que ainda tem sessão", async () => {
    pacotes.findMany.mockResolvedValue([pacote("velho", 5, 5), pacote("novo", 5, 1)]);

    expect((await activePackageFor("paciente", "clinica"))?.patientPackageId).toBe("novo");
  });

  it("só conta pacote pago, do tenant, e dentro da validade", async () => {
    pacotes.findMany.mockResolvedValue([]);
    await activePackageFor("paciente", "clinica");

    const where = pacotes.findMany.mock.calls[0][0].where;
    expect(where.patientId).toBe("paciente");
    expect(where.clinicId).toBe("clinica");
    expect(where.paid).toBe(true);
    expect(where.status).toEqual({ in: ["PAID", "ACTIVE"] });
    // vencido não serve, mesmo com sessão sobrando
    expect(JSON.stringify(where.OR)).toContain("endDate");
  });

  it("cancelada não conta como sessão gasta; falta conta", async () => {
    pacotes.findMany.mockResolvedValue([]);
    await activePackageFor("paciente", "clinica");

    const statusContados = pacotes.findMany.mock.calls[0][0].select.appointments.where.status.in;
    expect(statusContados).toContain("NO_SHOW");
    expect(statusContados).not.toContain("CANCELLED");
  });
});

describe("syncSessionsUsed", () => {
  it("conta de novo em vez de somar — uma linha que some por fora não corrompe", async () => {
    consultas.count.mockResolvedValue(3);

    expect(await syncSessionsUsed("p1")).toBe(3);
    expect(pacotes.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { sessionsUsed: 3 },
    });
  });
});
