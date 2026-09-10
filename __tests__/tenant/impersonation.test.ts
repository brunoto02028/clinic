/**
 * @jest-environment node
 *
 * The middleware honours the impersonation cookie for any ADMIN or SUPERADMIN
 * and the impersonate route never checked the tenant, so an admin of one
 * tenant could act as a patient of another — even without the route, by
 * forging the cookie — and every patient-facing API then answered as that
 * patient. getEffectiveUser now accepts the impersonation only for a patient
 * of the admin's own tenant.
 */

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/mobile-tokens", () => ({ verifyAccessToken: jest.fn() }));
jest.mock("next/headers", () => ({ headers: jest.fn(), cookies: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    clinic: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}));

import { getServerSession } from "next-auth";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

const session = getServerSession as jest.Mock;
const headersMock = headers as jest.Mock;
const cookiesMock = cookies as jest.Mock;
const users = (prisma as any).user;

const accounts: Record<string, { role: string; clinicId: string | null }> = {
  admin: { role: "ADMIN", clinicId: "clinicA" },
  therapist: { role: "THERAPIST", clinicId: "clinicA" },
  ownPatient: { role: "PATIENT", clinicId: "clinicA" },
  foreignPatient: { role: "PATIENT", clinicId: "clinicB" },
  orphanPatient: { role: "PATIENT", clinicId: null },
};

function request(realUser: string, headerValues: Record<string, string>) {
  session.mockResolvedValue({ user: { id: realUser, role: accounts[realUser].role } });
  headersMock.mockReturnValue({ get: (name: string) => headerValues[name] ?? null });
  cookiesMock.mockReturnValue({ get: () => undefined });
}

const asPatient = (patient: string, by = "admin") => ({
  "x-user-id": patient,
  "x-user-role": "PATIENT",
  "x-impersonated-by": by,
});

beforeEach(() => {
  jest.resetAllMocks();
  users.findUnique.mockImplementation(({ where }: any) => Promise.resolve(accounts[where.id] ?? null));
});

describe("getEffectiveUser — impersonation", () => {
  // Ids in these tests must pass the 10-50 character format check.
  beforeAll(() => {
    for (const key of Object.keys(accounts)) {
      const padded = key.padEnd(10, "x");
      if (padded !== key) {
        accounts[padded] = accounts[key];
        delete accounts[key];
      }
    }
  });
  const id = (key: string) => key.padEnd(10, "x");

  it("acts as a patient of the admin's own tenant", async () => {
    request(id("admin"), asPatient(id("ownPatient"), id("admin")));
    expect(await getEffectiveUser()).toEqual({
      userId: id("ownPatient"),
      role: "PATIENT",
      isImpersonating: true,
      realAdminId: id("admin"),
    });
  });

  it("refuses a patient of another tenant and carries on as the admin", async () => {
    request(id("admin"), asPatient(id("foreignPatient"), id("admin")));
    expect(await getEffectiveUser()).toEqual({ userId: id("admin"), role: "ADMIN", isImpersonating: false });
  });

  it("refuses a patient with no tenant", async () => {
    request(id("admin"), asPatient(id("orphanPatient"), id("admin")));
    expect(await getEffectiveUser()).toMatchObject({ userId: id("admin"), isImpersonating: false });
  });

  it("refuses headers naming someone other than the logged-in user as the impersonator", async () => {
    request(id("admin"), asPatient(id("ownPatient"), id("therapist")));
    expect(await getEffectiveUser()).toMatchObject({ userId: id("admin"), isImpersonating: false });
  });

  it("refuses impersonation by an account that is not an admin", async () => {
    request(id("therapist"), asPatient(id("ownPatient"), id("therapist")));
    expect(await getEffectiveUser()).toMatchObject({ userId: id("therapist"), isImpersonating: false });
  });

  it("leaves requests without impersonation untouched", async () => {
    request(id("admin"), {});
    expect(await getEffectiveUser()).toEqual({ userId: id("admin"), role: "ADMIN", isImpersonating: false });
    expect(users.findUnique).not.toHaveBeenCalled();
  });
});
