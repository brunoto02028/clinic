/**
 * @jest-environment node
 *
 * Nota SOAP não atravessa clínica.
 *
 * A rota lia o tenant de um header e, quando ele vinha vazio, consultava sem
 * filtro — o admin de uma clínica nova via as notas de todas (QA da 081,
 * 25/09/2026). O que fica preso aqui: sem clínica resolvida não há consulta
 * nenhuma, e com clínica o `where` carrega exatamente ela.
 */

jest.mock("@/lib/db", () => ({ prisma: { sOAPNote: { findMany: jest.fn() } } }));
jest.mock("@/lib/tenant-access", () => ({ getSessionStaffActor: jest.fn() }));
jest.mock("@/lib/dev-fallback", () => ({
  isDbUnreachableError: () => false,
  MOCK_SOAP_NOTES: [],
  devFallbackResponse: () => { throw new Error("não deveria cair no fallback"); },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { GET } from "../../app/api/admin/clinical-notes/route";

const req = () => new NextRequest("http://localhost/api/admin/clinical-notes");
const findMany = (prisma as any).sOAPNote.findMany as jest.Mock;
const actor = getSessionStaffActor as jest.Mock;

beforeEach(() => { jest.clearAllMocks(); findMany.mockResolvedValue([]); });

it("sem sessão de staff → 401, sem consulta", async () => {
  actor.mockResolvedValue(null);
  const r = await GET(req());
  expect(r.status).toBe(401);
  expect(findMany).not.toHaveBeenCalled();
});

it("staff sem clínica resolvida → 403, sem consulta — nunca 'todas'", async () => {
  actor.mockResolvedValue({ userId: "u1", role: "ADMIN", clinicId: null, isImpersonating: false });
  const r = await GET(req());
  expect(r.status).toBe(403);
  expect(findMany).not.toHaveBeenCalled();
});

it("com clínica, o where carrega exatamente ela", async () => {
  actor.mockResolvedValue({ userId: "u1", role: "THERAPIST", clinicId: "clinic-A", isImpersonating: false });
  const r = await GET(req());
  expect(r.status).toBe(200);
  expect(findMany).toHaveBeenCalledTimes(1);
  expect(findMany.mock.calls[0][0].where).toEqual({ clinicId: "clinic-A" });
});
