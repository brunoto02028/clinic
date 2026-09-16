/**
 * @jest-environment node
 *
 * One helper resolves the clinic a session works in (activity 47). The one it
 * replaces fell back to "whichever clinic comes first in the table", so an
 * account without a clinic acted on somebody else's tenant, and it ignored the
 * SUPERADMIN's "Active Clinic" — the social, marketing, equipment, calendar
 * and Atlas routes all ran on the wrong clinic after a switch.
 */

jest.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: jest.fn() }, clinic: { findUnique: jest.fn(), findFirst: jest.fn() } },
}));
jest.mock("@/lib/default-tenant", () => ({ getDefaultClinicId: jest.fn(async () => null) }));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { sessionClinicId } from "@/lib/session-clinic";

const users = (prisma as any).user;
const clinics = (prisma as any).clinic;
const cookiesMock = cookies as unknown as jest.Mock;

const withCookie = (value?: string) =>
  cookiesMock.mockReturnValue({ get: (name: string) => (name === "selected-clinic-id" && value ? { value } : undefined) });
const session = (role: string, clinicId: string | null, id = "u1") => ({ user: { id, role, clinicId } });

beforeEach(() => {
  jest.resetAllMocks();
  withCookie();
});

it("gives staff their own clinic, whatever clinic is selected", async () => {
  withCookie("clinicB");
  expect(await sessionClinicId(session("THERAPIST", "clinicA"))).toBe("clinicA");
  expect(await sessionClinicId(session("ADMIN", "clinicA"))).toBe("clinicA");
  expect(clinics.findFirst).not.toHaveBeenCalled();
});

it("gives a SUPERADMIN the active clinic, and their own when none is selected", async () => {
  clinics.findUnique.mockResolvedValue({ id: "clinicB", isActive: true });
  withCookie("clinicB");
  expect(await sessionClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicB");

  withCookie();
  expect(await sessionClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicA");
});

it("ignores a selected clinic that is inactive or gone", async () => {
  clinics.findUnique.mockResolvedValue(null);
  withCookie("deleted-clinic");
  expect(await sessionClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicA");

  clinics.findUnique.mockResolvedValue({ id: "clinicB", isActive: false });
  expect(await sessionClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicA");
});

it("reads the clinic from the database when the session predates it", async () => {
  users.findUnique.mockResolvedValue({ clinicId: "clinicA" });
  expect(await sessionClinicId(session("ADMIN", null))).toBe("clinicA");
  expect(users.findUnique).toHaveBeenCalledWith({ where: { id: "u1" }, select: { clinicId: true } });
});

it("answers null for an account with no clinic — never the first clinic in the table", async () => {
  users.findUnique.mockResolvedValue({ clinicId: null });
  expect(await sessionClinicId(session("ADMIN", null))).toBeNull();
  expect(clinics.findFirst).not.toHaveBeenCalled();
});

it("survives cookies() being unavailable (scripts, tests)", async () => {
  cookiesMock.mockImplementation(() => { throw new Error("outside a request"); });
  expect(await sessionClinicId(session("SUPERADMIN", "clinicA"))).toBe("clinicA");
});

it("answers null without a session", async () => {
  expect(await sessionClinicId(null)).toBeNull();
  expect(await sessionClinicId({})).toBeNull();
});
