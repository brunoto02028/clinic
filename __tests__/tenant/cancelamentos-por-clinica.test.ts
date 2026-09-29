/**
 * @jest-environment node
 *
 * A fila de cancelamentos é de uma clínica só.
 *
 * Achado no code review de 29/09/2026, fora do escopo da tarefa que o
 * encontrou: `GET /api/admin/cancellations` fazia `where: status ? { status } :
 * {}` — sem `clinicId`. Qualquer ADMIN, de qualquer inquilino, lia as
 * solicitações de todos, com nome, e-mail e **o motivo em texto livre** que o
 * paciente escreveu.
 *
 * O POST era pior: `findUnique` pelo id, sem conferir dono. Administrador da
 * clínica B aprovava, recusava e disparava `stripe.refunds.create` sobre o
 * pagamento de um paciente da clínica A.
 *
 * `CancellationRequest` não tem `clinicId` próprio, então a parede é o dono do
 * pedido: `patient.clinicId`.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    cancellationRequest: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    appointment: { update: jest.fn() },
    treatmentPlan: { update: jest.fn() },
  },
}));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
}));
jest.mock("@/lib/stripe", () => ({ stripe: { refunds: { create: jest.fn() } } }));
jest.mock("@/lib/waitlist", () => ({ notifyWaitlistForCancelledAppointment: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, type Actor } from "@/lib/tenant-access";
import { GET, POST } from "@/app/api/admin/cancellations/route";

const pedidos = (prisma as any).cancellationRequest;
const actorMock = getActor as jest.Mock;

const actor = (over: Partial<Actor> = {}): Actor => ({
  userId: "u1",
  role: "ADMIN",
  clinicId: "clinicaA",
  isImpersonating: false,
  ...over,
});

const get = (url = "/api/admin/cancellations") =>
  GET(new NextRequest("http://localhost" + url));

const post = (body: any) =>
  POST(new NextRequest("http://localhost/api/admin/cancellations", {
    method: "POST",
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  jest.resetAllMocks();
  pedidos.findMany.mockResolvedValue([]);
});

describe("GET — a fila é da clínica de quem pergunta", () => {
  it("**a consulta carrega a parede do inquilino**", async () => {
    actorMock.mockResolvedValue(actor());
    await get();
    const where = pedidos.findMany.mock.calls[0][0].where;
    expect(where.patient).toEqual({ clinicId: "clinicaA" });
  });

  it("o filtro de status não substitui a parede", async () => {
    // Era `where: status ? { status } : {}` — passar `status` trocava um pelo
    // outro. Os dois têm de estar.
    actorMock.mockResolvedValue(actor());
    await get("/api/admin/cancellations?status=PENDING");
    const where = pedidos.findMany.mock.calls[0][0].where;
    expect(where.patient).toEqual({ clinicId: "clinicaA" });
    expect(where.status).toBe("PENDING");
  });

  it("cada clínica pergunta pela sua", async () => {
    actorMock.mockResolvedValue(actor({ clinicId: "clinicaB" }));
    await get();
    expect(pedidos.findMany.mock.calls[0][0].where.patient).toEqual({ clinicId: "clinicaB" });
  });

  it("o terapeuta lê a fila", async () => {
    actorMock.mockResolvedValue(actor({ role: "THERAPIST" }));
    expect((await get()).status).toBe(200);
  });

  it("**paciente não lê a fila**", async () => {
    actorMock.mockResolvedValue(actor({ role: "PATIENT" }));
    expect((await get()).status).toBe(403);
    expect(pedidos.findMany).not.toHaveBeenCalled();
  });

  it("sem sessão, 401", async () => {
    actorMock.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    expect(pedidos.findMany).not.toHaveBeenCalled();
  });

  it("sem clínica escolhida não devolve tudo — recusa", async () => {
    // O pior desfecho possível seria tratar "sem inquilino" como "todos".
    actorMock.mockResolvedValue(actor({ clinicId: null }));
    expect((await get()).status).toBe(400);
    expect(pedidos.findMany).not.toHaveBeenCalled();
  });
});

describe("POST — só se o pedido for desta clínica", () => {
  it("**a busca do pedido carrega a parede junto do id**", async () => {
    actorMock.mockResolvedValue(actor());
    pedidos.findFirst.mockResolvedValue(null);
    await post({ requestId: "r1", action: "approve" });
    expect(pedidos.findFirst.mock.calls[0][0].where).toEqual({
      id: "r1",
      patient: { clinicId: "clinicaA" },
    });
  });

  it("**pedido de outra clínica responde 404, e não 403**", async () => {
    // Distinguir "não existe" de "não é seu" conta a um estranho que o
    // registro existe.
    actorMock.mockResolvedValue(actor());
    pedidos.findFirst.mockResolvedValue(null);
    const res = await post({ requestId: "de-outra-clinica", action: "refund" });
    expect(res.status).toBe(404);
  });

  it("e nada é alterado nem reembolsado", async () => {
    actorMock.mockResolvedValue(actor());
    pedidos.findFirst.mockResolvedValue(null);
    await post({ requestId: "de-outra-clinica", action: "refund" });
    expect(pedidos.update).not.toHaveBeenCalled();
    const { stripe } = require("@/lib/stripe");
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it("**terapeuta não aprova nem reembolsa** — só administração mexe no dinheiro", async () => {
    actorMock.mockResolvedValue(actor({ role: "THERAPIST" }));
    expect((await post({ requestId: "r1", action: "refund" })).status).toBe(403);
    expect(pedidos.findFirst).not.toHaveBeenCalled();
  });

  it("sem sessão, 401", async () => {
    actorMock.mockResolvedValue(null);
    expect((await post({ requestId: "r1", action: "approve" })).status).toBe(401);
  });

  it("sem clínica escolhida, recusa antes de olhar o pedido", async () => {
    actorMock.mockResolvedValue(actor({ clinicId: null }));
    expect((await post({ requestId: "r1", action: "approve" })).status).toBe(400);
    expect(pedidos.findFirst).not.toHaveBeenCalled();
  });
});
