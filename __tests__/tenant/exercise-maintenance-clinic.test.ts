/**
 * @jest-environment node
 *
 * The library's maintenance routes used to work on every clinic's exercises at
 * once (activity 47): they now stay inside the clinic the caller is working in,
 * and reaching across tenants has to be asked for with ?allClinics=true.
 */

jest.mock("@/lib/db", () => ({
  prisma: { exercise: { findMany: jest.fn(), update: jest.fn() } },
}));
jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth-options", () => ({ authOptions: {} }));
jest.mock("@/lib/video-thumbnail", () => ({ getVideoDuration: jest.fn(async () => 42) }));
jest.mock("@/lib/session-clinic", () => ({
  sessionClinicId: jest.fn(),
  NO_CLINIC: { error: "No clinic resolved for this account" },
}));

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { sessionClinicId } from "@/lib/session-clinic";
import { POST as backfillDuration } from "@/app/api/admin/exercises/backfill-duration/route";

const exercises = (prisma as any).exercise;
const sessionMock = getServerSession as jest.Mock;
const clinicMock = sessionClinicId as jest.Mock;
const req = (url = "/api/admin/exercises/backfill-duration") =>
  new NextRequest("http://localhost" + url, { method: "POST" });

beforeEach(() => {
  jest.resetAllMocks();
  sessionMock.mockResolvedValue({ user: { id: "s1", role: "SUPERADMIN", clinicId: "clinicA" } });
  clinicMock.mockResolvedValue("clinicA");
  exercises.findMany.mockResolvedValue([]);
});

it("only touches the working clinic's exercises", async () => {
  const res = await backfillDuration(req());
  expect(res.status).toBe(200);
  expect(exercises.findMany.mock.calls[0][0].where).toMatchObject({ clinicId: "clinicA", duration: null });
  expect((await res.json()).scope).toBe("clinicA");
});

it("reaches every clinic only when asked to", async () => {
  const res = await backfillDuration(req("/api/admin/exercises/backfill-duration?allClinics=true"));
  expect(exercises.findMany.mock.calls[0][0].where).not.toHaveProperty("clinicId");
  expect((await res.json()).scope).toBe("all clinics");
});

it("refuses when no clinic resolves, instead of running platform-wide", async () => {
  clinicMock.mockResolvedValue(null);
  expect((await backfillDuration(req())).status).toBe(403);
  expect(exercises.findMany).not.toHaveBeenCalled();
});

it("stays SUPERADMIN-only", async () => {
  sessionMock.mockResolvedValue({ user: { id: "a1", role: "ADMIN", clinicId: "clinicA" } });
  expect((await backfillDuration(req())).status).toBe(401);
  expect(exercises.findMany).not.toHaveBeenCalled();
});
