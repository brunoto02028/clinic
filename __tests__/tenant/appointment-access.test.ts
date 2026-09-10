/**
 * @jest-environment node
 *
 * A student of one tenant could list, see the free slots of and book with a
 * therapist of another; a booking with no therapist went to the platform's
 * first staff account, bookable or not; and "view all" showed every tenant's
 * diary (ISO-3..6 and X1 of the activity-19 audit).
 */

jest.mock("@/lib/db", () => ({
  prisma: { user: { findFirst: jest.fn() } },
}));

import { prisma } from "@/lib/db";
import { appointmentTenantWhere, findTherapist } from "@/lib/appointment-access";

const findFirst = (prisma as any).user.findFirst as jest.Mock;

beforeEach(() => {
  findFirst.mockReset().mockResolvedValue({ id: "t1" });
});

describe("appointmentTenantWhere", () => {
  it("keeps legacy rows without a tenant visible through their therapist's tenant", () => {
    expect(appointmentTenantWhere("clinicA")).toEqual({
      OR: [{ clinicId: "clinicA" }, { clinicId: null, therapist: { clinicId: "clinicA" } }],
    });
  });
});

describe("findTherapist", () => {
  it("only ever looks inside the given tenant, among active staff", async () => {
    await findTherapist("clinicA", "t1", false);

    const { where } = findFirst.mock.calls[0][0];
    expect(where).toMatchObject({ clinicId: "clinicA", isActive: true, id: "t1" });
    expect(where.role.in).toEqual(["SUPERADMIN", "ADMIN", "THERAPIST"]);
    expect(where.bookable).toBeUndefined();
  });

  it("requires the bookable flag when a patient is choosing", async () => {
    await findTherapist("clinicA", null, true);

    const { where, orderBy } = findFirst.mock.calls[0][0];
    expect(where).toMatchObject({ clinicId: "clinicA", bookable: true });
    expect(where.id).toBeUndefined();
    expect(orderBy).toEqual({ createdAt: "asc" });
  });

  it("returns nothing for a therapist outside the tenant", async () => {
    findFirst.mockResolvedValue(null);
    expect(await findTherapist("clinicA", "someone-from-clinicB", true)).toBeNull();
  });
});
