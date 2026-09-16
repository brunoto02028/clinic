/**
 * @jest-environment node
 *
 * The exercise library follows the clinic the caller works in (activity 46) —
 * the same "Active Clinic" as patients and protocols. It used to read the
 * clinic off the session and, with none there, fall back to whichever clinic
 * came first in the table.
 */

jest.mock("@/lib/db", () => ({
  prisma: { exercise: { findMany: jest.fn(), count: jest.fn() }, clinic: { findFirst: jest.fn(), findUnique: jest.fn() } },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/default-tenant", () => ({ getDefaultClinicId: jest.fn(async () => "defaultClinic") }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { resolveClinicId } from "@/lib/exercise-folders";
import { GET as exercisesGet } from "@/app/api/admin/exercises/route";

const exercises = (prisma as any).exercise;
const clinics = (prisma as any).clinic;
const sessionMock = getServerSession as jest.Mock;
const cookiesMock = cookies as unknown as jest.Mock;

const withCookie = (value?: string) =>
  cookiesMock.mockReturnValue({ get: (name: string) => (name === "selected-clinic-id" && value ? { value } : undefined) });
const session = (role: string, clinicId: string | null) => ({ user: { id: "u1", role, clinicId } });
const req = (url = "/api/admin/exercises?all=true") => new NextRequest("http://localhost" + url);

beforeEach(() => {
  jest.resetAllMocks();
  withCookie();
  exercises.findMany.mockResolvedValue([]);
  exercises.count.mockResolvedValue(0);
});

describe("resolveClinicId", () => {
  it("gives staff their own clinic, whatever cookie is set", async () => {
    withCookie("clinicB");
    expect(await resolveClinicId(session("THERAPIST", "clinicA"))).toBe("clinicA");
    expect(clinics.findFirst).not.toHaveBeenCalled();
  });

  it("gives a SUPERADMIN the active clinic, and their own when none is selected", async () => {
    clinics.findUnique.mockResolvedValue({ id: "clinicB", isActive: true });
    withCookie("clinicB");
    expect(await resolveClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicB");

    withCookie();
    expect(await resolveClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicA");
  });

  it("never falls back to an arbitrary clinic for staff without one", async () => {
    expect(await resolveClinicId(session("ADMIN", null))).toBeNull();
    expect(clinics.findFirst).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/exercises", () => {
  it("lists the active clinic's library", async () => {
    clinics.findUnique.mockResolvedValue({ id: "clinicB", isActive: true });
    withCookie("clinicB");
    sessionMock.mockResolvedValue(session("SUPERADMIN", "clinicA"));
    const res = await exercisesGet(req());
    expect(res.status).toBe(200);
    expect(exercises.findMany.mock.calls[0][0].where).toMatchObject({ isActive: true, clinicId: "clinicB" });
  });

  it("answers 403 instead of listing every clinic when none resolves", async () => {
    sessionMock.mockResolvedValue(session("ADMIN", null));
    expect((await exercisesGet(req())).status).toBe(403);
    expect(exercises.findMany).not.toHaveBeenCalled();
  });

  it("refuses a patient", async () => {
    sessionMock.mockResolvedValue(session("PATIENT", "clinicA"));
    expect((await exercisesGet(req())).status).toBe(401);
  });
});
