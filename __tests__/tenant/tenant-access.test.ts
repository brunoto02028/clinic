/**
 * @jest-environment node
 *
 * The tenant isolation QA (activity 19) found staff of one tenant reading,
 * editing and deleting another tenant's patients, and a patient reading
 * another patient's body assessment. Every route now asks lib/tenant-access
 * who is calling and whether a record is within reach; these tests pin that
 * contract — above all, that it fails closed.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    clinic: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import {
  AccessError,
  getActor,
  assertRecordAccess,
  assertClinicAccess,
  assertPatientAccess,
  tenantWhere,
  requireStaff,
  type Actor,
} from "@/lib/tenant-access";
import { getDefaultClinicId } from "@/lib/default-tenant";

const users = (prisma as any).user;
const clinics = (prisma as any).clinic;
const effective = getEffectiveUser as jest.Mock;
const env = process.env as Record<string, string | undefined>;
const originalSlug = env.DEFAULT_CLINIC_SLUG;

function request(cookie?: string) {
  return new NextRequest("http://localhost/api/anything", {
    headers: cookie ? { cookie } : {},
  });
}

const actor = (over: Partial<Actor>): Actor => ({
  userId: "u1",
  role: "ADMIN",
  clinicId: "clinicA",
  isImpersonating: false,
  ...over,
});

function statusOf(fn: () => unknown): number | "ok" {
  try {
    fn();
    return "ok";
  } catch (err) {
    if (err instanceof AccessError) return err.status;
    throw err;
  }
}

beforeEach(() => {
  jest.resetAllMocks();
  delete env.DEFAULT_CLINIC_SLUG;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalSlug === undefined) delete env.DEFAULT_CLINIC_SLUG;
  else env.DEFAULT_CLINIC_SLUG = originalSlug;
});

describe("getActor", () => {
  it("is null without an authenticated user", async () => {
    effective.mockResolvedValue(null);
    expect(await getActor(request())).toBeNull();
  });

  it("is null for a deactivated account", async () => {
    effective.mockResolvedValue({ userId: "u1", role: "ADMIN", isImpersonating: false });
    users.findUnique.mockResolvedValue({ id: "u1", role: "ADMIN", clinicId: "clinicA", isActive: false });
    expect(await getActor(request())).toBeNull();
  });

  it("takes role and tenant from the database, not from the token", async () => {
    effective.mockResolvedValue({ userId: "u1", role: "ADMIN", isImpersonating: false });
    users.findUnique.mockResolvedValue({ id: "u1", role: "THERAPIST", clinicId: "clinicB", isActive: true });

    expect(await getActor(request())).toEqual({
      userId: "u1",
      role: "THERAPIST",
      clinicId: "clinicB",
      isImpersonating: false,
    });
  });

  it("acts as the impersonated patient", async () => {
    effective.mockResolvedValue({ userId: "p1", role: "PATIENT", isImpersonating: true, realAdminId: "a1" });
    users.findUnique.mockResolvedValue({ id: "p1", role: "PATIENT", clinicId: "clinicA", isActive: true });

    expect(await getActor(request())).toMatchObject({ userId: "p1", role: "PATIENT", isImpersonating: true });
  });

  describe("SUPERADMIN", () => {
    beforeEach(() => {
      effective.mockResolvedValue({ userId: "s1", role: "SUPERADMIN", isImpersonating: false });
      users.findUnique.mockResolvedValue({ id: "s1", role: "SUPERADMIN", clinicId: null, isActive: true });
    });

    it("works in the selected clinic when it exists and is active", async () => {
      clinics.findUnique.mockResolvedValue({ id: "clinicB", isActive: true });
      expect((await getActor(request("selected-clinic-id=clinicB")))?.clinicId).toBe("clinicB");
    });

    it("ignores a selected clinic that does not exist and falls back to the default tenant", async () => {
      clinics.findUnique.mockResolvedValue(null);
      clinics.findMany.mockResolvedValue([{ id: "clinicA" }]);
      expect((await getActor(request("selected-clinic-id=forged")))?.clinicId).toBe("clinicA");
    });

    it("has no tenant when several clinics exist and none is named default", async () => {
      clinics.findMany.mockResolvedValue([{ id: "clinicA" }, { id: "clinicB" }]);
      expect((await getActor(request()))?.clinicId).toBeNull();
    });

    // "All clinics" is the default state, so the owner must not lose their own
    // clinic the moment a second tenant exists.
    it("works in their own clinic when none is selected", async () => {
      users.findUnique.mockResolvedValue({ id: "s1", role: "SUPERADMIN", clinicId: "clinicOwn", isActive: true });
      clinics.findMany.mockResolvedValue([{ id: "clinicA" }, { id: "clinicB" }]);

      expect((await getActor(request()))?.clinicId).toBe("clinicOwn");
      expect(clinics.findMany).not.toHaveBeenCalled();
    });

    it("still prefers the selected clinic over their own", async () => {
      users.findUnique.mockResolvedValue({ id: "s1", role: "SUPERADMIN", clinicId: "clinicOwn", isActive: true });
      clinics.findUnique.mockResolvedValue({ id: "clinicB", isActive: true });

      expect((await getActor(request("selected-clinic-id=clinicB")))?.clinicId).toBe("clinicB");
    });
  });
});

describe("getDefaultClinicId", () => {
  it("uses DEFAULT_CLINIC_SLUG when set", async () => {
    env.DEFAULT_CLINIC_SLUG = "bpr";
    clinics.findUnique.mockResolvedValue({ id: "clinicA", isActive: true });
    expect(await getDefaultClinicId()).toBe("clinicA");
  });

  it("returns null when DEFAULT_CLINIC_SLUG names no active clinic", async () => {
    env.DEFAULT_CLINIC_SLUG = "gone";
    clinics.findUnique.mockResolvedValue(null);
    expect(await getDefaultClinicId()).toBeNull();
  });

  it("infers the only active clinic", async () => {
    clinics.findMany.mockResolvedValue([{ id: "clinicA" }]);
    expect(await getDefaultClinicId()).toBe("clinicA");
  });

  it("refuses to guess between several clinics", async () => {
    clinics.findMany.mockResolvedValue([{ id: "clinicA" }, { id: "clinicB" }]);
    expect(await getDefaultClinicId()).toBeNull();
  });
});

describe("assertRecordAccess", () => {
  const recordA = { clinicId: "clinicA", patientId: "p1" };

  it("lets a patient reach their own record only", () => {
    expect(statusOf(() => assertRecordAccess(actor({ role: "PATIENT", userId: "p1" }), recordA))).toBe("ok");
    expect(statusOf(() => assertRecordAccess(actor({ role: "PATIENT", userId: "p2" }), recordA))).toBe(404);
  });

  it("lets staff reach records of their own tenant only", () => {
    expect(statusOf(() => assertRecordAccess(actor({ role: "THERAPIST" }), recordA))).toBe("ok");
    expect(statusOf(() => assertRecordAccess(actor({ clinicId: "clinicB" }), recordA))).toBe(404);
  });

  it("never matches a missing tenant against a legacy record without one", () => {
    const legacy = { clinicId: null, patientId: "p1" };
    expect(statusOf(() => assertRecordAccess(actor({ clinicId: null }), legacy))).toBe(404);
  });

  it("confines a SUPERADMIN to the tenant it is working in", () => {
    const superadmin = actor({ role: "SUPERADMIN", clinicId: "clinicA" });
    expect(statusOf(() => assertRecordAccess(superadmin, recordA))).toBe("ok");
    expect(statusOf(() => assertRecordAccess(superadmin, { clinicId: "clinicB", patientId: "p9" }))).toBe(404);
    expect(statusOf(() => assertClinicAccess(superadmin, "clinicB"))).toBe(404);
  });

  it("gives a patient nothing when the record names no patient", () => {
    const patient = actor({ role: "PATIENT", userId: "p1" });
    expect(statusOf(() => assertRecordAccess(patient, { clinicId: "clinicA", patientId: null }))).toBe(404);
  });
});

describe("assertClinicAccess", () => {
  it("is staff-only and same-tenant-only", () => {
    expect(statusOf(() => assertClinicAccess(actor({}), "clinicA"))).toBe("ok");
    expect(statusOf(() => assertClinicAccess(actor({}), "clinicB"))).toBe(404);
    expect(statusOf(() => assertClinicAccess(actor({ role: "PATIENT" }), "clinicA"))).toBe(404);
    expect(statusOf(() => assertClinicAccess(actor({ clinicId: null }), null))).toBe(404);
  });
});

describe("assertPatientAccess", () => {
  it("lets a patient act only on themself", async () => {
    await expect(assertPatientAccess(actor({ role: "PATIENT", userId: "p1" }), "p1")).resolves.toMatchObject({ id: "p1" });
    await expect(assertPatientAccess(actor({ role: "PATIENT", userId: "p1" }), "p2")).rejects.toMatchObject({ status: 404 });
  });

  it("lets staff act on patients of their own tenant", async () => {
    users.findUnique.mockResolvedValue({ id: "p1", role: "PATIENT", clinicId: "clinicA" });
    await expect(assertPatientAccess(actor({}), "p1")).resolves.toEqual({ id: "p1", clinicId: "clinicA" });
  });

  it("hides patients of another tenant", async () => {
    users.findUnique.mockResolvedValue({ id: "p1", role: "PATIENT", clinicId: "clinicB" });
    await expect(assertPatientAccess(actor({}), "p1")).rejects.toMatchObject({ status: 404 });
  });

  it("does not treat staff accounts as patients", async () => {
    users.findUnique.mockResolvedValue({ id: "a2", role: "ADMIN", clinicId: "clinicA" });
    await expect(assertPatientAccess(actor({}), "a2")).rejects.toMatchObject({ status: 404 });
  });
});

describe("tenantWhere and requireStaff", () => {
  it("scopes to the actor's tenant and refuses when there is none", () => {
    expect(tenantWhere(actor({}))).toEqual({ clinicId: "clinicA" });
    expect(statusOf(() => tenantWhere(actor({ clinicId: null })))).toBe(403);
  });

  it("keeps patients out of staff operations", () => {
    expect(statusOf(() => requireStaff(actor({ role: "PATIENT" })))).toBe(403);
    expect(statusOf(() => requireStaff(actor({ role: "THERAPIST" })))).toBe("ok");
  });
});
