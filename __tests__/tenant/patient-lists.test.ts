/**
 * @jest-environment node
 *
 * Patient lists are per clinic (activity 46). `GET /api/patients?clinicId=` used
 * to be honoured for every caller, so staff of one clinic could list another
 * clinic's patients; and both lists ignored the SUPERADMIN's "Active Clinic",
 * offering patients that every /api/admin/patients/[id] route then 404s on.
 */

jest.mock("@/lib/db", () => ({
  prisma: { user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() } },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));
jest.mock("@/lib/default-tenant", () => ({ getDefaultClinicId: jest.fn() }));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/dev-fallback", () => ({
  isDbUnreachableError: () => false,
  MOCK_PATIENTS: [],
  devFallbackResponse: jest.fn(),
}));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { getActor, type Actor } from "@/lib/tenant-access";
import { GET as patientsGet } from "@/app/api/patients/route";
import { GET as adminPatientsGet } from "@/app/api/admin/patients/route";

const users = (prisma as any).user;
const sessionMock = getServerSession as jest.Mock;
const actorMock = getActor as jest.Mock;

const actor = (over: Partial<Actor> = {}): Actor => ({
  userId: "u1",
  role: "THERAPIST",
  clinicId: "clinicA",
  isImpersonating: false,
  ...over,
});
const req = (url: string) => new NextRequest("http://localhost" + url);
const whereOf = () => users.findMany.mock.calls[0][0].where;

beforeEach(() => {
  jest.resetAllMocks();
  users.findMany.mockResolvedValue([]);
});

describe("GET /api/patients", () => {
  const asStaff = (over: Partial<Actor> = {}) => {
    const a = actor(over);
    sessionMock.mockResolvedValue({ user: { id: a.userId } });
    users.findUnique.mockResolvedValue({ id: a.userId, role: a.role, clinicId: a.clinicId, isActive: true });
  };

  it("ignores ?clinicId from staff and lists only their own clinic", async () => {
    asStaff();
    const res = await patientsGet(req("/api/patients?clinicId=clinicB"));
    expect(res.status).toBe(200);
    expect(whereOf()).toMatchObject({ role: "PATIENT", clinicId: "clinicA" });
  });

  it("lets a SUPERADMIN point it at another clinic, else uses the active one", async () => {
    asStaff({ role: "SUPERADMIN", clinicId: "clinicA" });
    await patientsGet(req("/api/patients?clinicId=clinicB"));
    expect(whereOf()).toMatchObject({ clinicId: "clinicB" });

    users.findMany.mockClear();
    await patientsGet(req("/api/patients"));
    expect(whereOf()).toMatchObject({ clinicId: "clinicA" });
  });

  it("refuses a patient, an anonymous caller and staff with no clinic", async () => {
    sessionMock.mockResolvedValue({ user: { id: "p1" } });
    users.findUnique.mockResolvedValue({ id: "p1", role: "PATIENT", clinicId: "clinicA", isActive: true });
    expect((await patientsGet(req("/api/patients"))).status).toBe(401);

    sessionMock.mockResolvedValue(null);
    expect((await patientsGet(req("/api/patients"))).status).toBe(401);

    sessionMock.mockResolvedValue({ user: { id: "u2" } });
    users.findUnique.mockResolvedValue({ id: "u2", role: "ADMIN", clinicId: null, isActive: true });
    expect((await patientsGet(req("/api/patients"))).status).toBe(403);
    expect(users.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/patients", () => {
  it("lists the clinic the caller works in", async () => {
    actorMock.mockResolvedValue(actor({ role: "SUPERADMIN", clinicId: "activeClinic" }));
    const res = await adminPatientsGet(req("/api/admin/patients?limit=500"));
    expect(res.status).toBe(200);
    expect(whereOf()).toMatchObject({ role: "PATIENT", clinicId: "activeClinic" });
  });

  it("keeps the search and letter filters", async () => {
    actorMock.mockResolvedValue(actor());
    await adminPatientsGet(req("/api/admin/patients?search=ana&letter=A"));
    const where = whereOf();
    expect(where.clinicId).toBe("clinicA");
    expect(where.OR).toHaveLength(3);
    expect(where.firstName).toEqual({ startsWith: "A", mode: "insensitive" });
  });

  it("refuses a patient and staff with no clinic", async () => {
    actorMock.mockResolvedValue(actor({ role: "PATIENT" }));
    expect((await adminPatientsGet(req("/api/admin/patients"))).status).toBe(403);

    actorMock.mockResolvedValue(actor({ clinicId: null }));
    expect((await adminPatientsGet(req("/api/admin/patients"))).status).toBe(403);

    actorMock.mockResolvedValue(null);
    expect((await adminPatientsGet(req("/api/admin/patients"))).status).toBe(401);
    expect(users.findMany).not.toHaveBeenCalled();
  });
});
