/**
 * @jest-environment node
 *
 * Protocol templates belong to one clinic (activity 45): every template route
 * resolves the caller's clinic and only ever sees that clinic's templates and
 * exercises.
 */

jest.mock("@/lib/db", () => ({
  prisma: {
    protocolTemplate: { findFirst: jest.fn() },
    exercise: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/get-effective-user", () => ({ getEffectiveUser: jest.fn() }));
jest.mock("@/lib/default-tenant", () => ({ getDefaultClinicId: jest.fn() }));
jest.mock("@/lib/tenant-access", () => ({
  ...jest.requireActual("@/lib/tenant-access"),
  getActor: jest.fn(),
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, type Actor } from "@/lib/tenant-access";
import {
  staffTenantAccess,
  templateInTenant,
  clinicExerciseIds,
  mapExercisesToClinic,
} from "@/lib/protocol-template-access";

const templates = (prisma as any).protocolTemplate;
const exercises = (prisma as any).exercise;
const actorMock = getActor as jest.Mock;
const request = new NextRequest("http://localhost/api/admin/protocols");

const actor = (over: Partial<Actor>): Actor => ({
  userId: "u1",
  role: "THERAPIST",
  clinicId: "clinicA",
  isImpersonating: false,
  ...over,
});

beforeEach(() => jest.resetAllMocks());

describe("staffTenantAccess", () => {
  it("rejects anonymous callers, patients and staff without a clinic", async () => {
    actorMock.mockResolvedValue(null);
    expect((await staffTenantAccess(request)).response?.status).toBe(401);

    actorMock.mockResolvedValue(actor({ role: "PATIENT" }));
    expect((await staffTenantAccess(request)).response?.status).toBe(403);

    actorMock.mockResolvedValue(actor({ role: "SUPERADMIN", clinicId: null }));
    const res = (await staffTenantAccess(request)).response;
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: "No clinic resolved for this account" });
  });

  it("returns the actor with its clinic", async () => {
    actorMock.mockResolvedValue(actor({ role: "ADMIN" }));
    const result = await staffTenantAccess(request);
    expect(result.response).toBeUndefined();
    expect(result.actor).toMatchObject({ role: "ADMIN", clinicId: "clinicA" });
  });
});

describe("templateInTenant", () => {
  it("looks the template up inside the clinic only", async () => {
    templates.findFirst.mockResolvedValue({ id: "t1" });
    expect(await templateInTenant("t1", "clinicA", { items: true })).toEqual({ id: "t1" });
    expect(templates.findFirst).toHaveBeenCalledWith({ where: { id: "t1", clinicId: "clinicA" }, include: { items: true } });
  });

  it("answers null for another clinic's template", async () => {
    templates.findFirst.mockResolvedValue(null);
    expect(await templateInTenant("t-other", "clinicA")).toBeNull();
    expect(templates.findFirst).toHaveBeenCalledWith({ where: { id: "t-other", clinicId: "clinicA" } });
  });

  it("never queries for a missing or non-string id", async () => {
    expect(await templateInTenant(undefined, "clinicA")).toBeNull();
    expect(await templateInTenant({ not: "an id" }, "clinicA")).toBeNull();
    expect(await templateInTenant("", "clinicA")).toBeNull();
    expect(templates.findFirst).not.toHaveBeenCalled();
  });
});

describe("clinicExerciseIds", () => {
  it("keeps only this clinic's exercises and skips junk ids", async () => {
    exercises.findMany.mockResolvedValue([{ id: "e1" }]);
    const ids = await clinicExerciseIds(["e1", "e-other", null, "", 7, "e1"], "clinicA");
    expect([...ids]).toEqual(["e1"]);
    expect(exercises.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["e1", "e-other"] }, clinicId: "clinicA" },
      select: { id: true },
    });
  });

  it("doesn't query when there is nothing to check", async () => {
    expect((await clinicExerciseIds([null, undefined], "clinicA")).size).toBe(0);
    expect(exercises.findMany).not.toHaveBeenCalled();
  });
});

describe("mapExercisesToClinic", () => {
  it("keeps own exercises, swaps foreign ones for the clinic's same-named exercise, drops the rest", async () => {
    exercises.findMany
      // own ids
      .mockResolvedValueOnce([{ id: "own" }])
      // names of the foreign ids
      .mockResolvedValueOnce([
        { id: "foreign-squat", name: "Wall Squat" },
        { id: "foreign-bridge", name: "Glute Bridge" },
      ])
      // this clinic's exercises with those names (oldest first)
      .mockResolvedValueOnce([
        { id: "our-squat-old", name: "wall squat" },
        { id: "our-squat-new", name: "Wall Squat" },
      ]);

    const map = await mapExercisesToClinic(["own", "foreign-squat", "foreign-bridge", "gone", null], "clinicA");

    expect(map.get("own")).toBe("own");
    expect(map.get("foreign-squat")).toBe("our-squat-old");
    expect(map.get("foreign-bridge")).toBeNull();
    expect(map.get("gone")).toBeNull();
    expect(exercises.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinicId: "clinicA", isActive: true }),
        orderBy: { createdAt: "asc" },
      })
    );
  });

  it("doesn't look for replacements when every exercise is already the clinic's", async () => {
    exercises.findMany.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    const map = await mapExercisesToClinic(["a", "b"], "clinicA");
    expect(Object.fromEntries(map)).toEqual({ a: "a", b: "b" });
    expect(exercises.findMany).toHaveBeenCalledTimes(1);
  });
});
