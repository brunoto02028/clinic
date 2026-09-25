/**
 * @jest-environment node
 *
 * O badge do menu contava o que está parado — e aceitava `?clinicId=` de
 * qualquer staff. Um terapeuta da clínica B pedia `?clinicId=<clínica A>` e
 * recebia as contagens da A: quantos vídeos de exercício e quantas mensagens
 * de paciente estavam esperando lá. Números sem nome, mas de outra clínica.
 *
 * Mesma família do `patient-lists.test.ts` e do `a04338cd` (076).
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findMany: jest.fn() },
    unassignedMeasurement: { count: jest.fn() },
    exerciseSubmission: { count: jest.fn() },
  },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/admin/pending-count/route";

const sessionMock = getServerSession as jest.Mock;
const users = (prisma as any).user;
const medicoes = (prisma as any).unassignedMeasurement;
const envios = (prisma as any).exerciseSubmission;

const req = (url: string) => new NextRequest("http://localhost" + url);
const sessao = (role: string, clinicId: string | null) =>
  sessionMock.mockResolvedValue({ user: { id: "u1", role, clinicId } });

beforeEach(() => {
  jest.clearAllMocks();
  users.findMany.mockResolvedValue([]);
  medicoes.count.mockResolvedValue(0);
  envios.count.mockResolvedValue(0);
});

describe("GET /api/admin/pending-count", () => {
  it("ignora ?clinicId= de um terapeuta e conta só a clínica dele", async () => {
    sessao("THERAPIST", "clinicB");

    await GET(req("/api/admin/pending-count?clinicId=clinicA"));

    for (const chamada of users.findMany.mock.calls) {
      expect(chamada[0].where.clinicId).toBe("clinicB");
    }
    expect(envios.count.mock.calls[0][0].where.clinicId).toBe("clinicB");
    expect(medicoes.count.mock.calls[0][0].where.clinicId).toBe("clinicB");
  });

  it("ignora ?clinicId= de um admin de clínica também", async () => {
    sessao("ADMIN", "clinicB");

    await GET(req("/api/admin/pending-count?clinicId=clinicA"));

    expect(envios.count.mock.calls[0][0].where.clinicId).toBe("clinicB");
  });

  it("honra ?clinicId= para o SUPERADMIN, que enxerga todos os tenants", async () => {
    sessao("SUPERADMIN", null);

    await GET(req("/api/admin/pending-count?clinicId=clinicA"));

    expect(envios.count.mock.calls[0][0].where.clinicId).toBe("clinicA");
  });

  it("staff sem clínica não vira staff de todas: devolve zeros sem consultar", async () => {
    sessao("THERAPIST", null);

    const res = await GET(req("/api/admin/pending-count"));

    expect(await res.json()).toEqual({
      pendingPatients: 0,
      unreadMessages: 0,
      answeredQuestions: 0,
      unassignedMeasurements: 0,
      unreviewedSubmissions: 0,
    });
    expect(users.findMany).not.toHaveBeenCalled();
    expect(envios.count).not.toHaveBeenCalled();
  });

  it("paciente não lê o contador da clínica", async () => {
    sessao("PATIENT", "clinicA");

    const res = await GET(req("/api/admin/pending-count?clinicId=clinicA"));

    expect(res.status).toBe(403);
    expect(envios.count).not.toHaveBeenCalled();
  });
});
