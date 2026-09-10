/**
 * @jest-environment node
 *
 * Any logged-in user — a patient included — could read another patient's
 * body assessment by id, and four of the assessment actions (AI analysis,
 * AI enhance, recapture request, capture link) needed nothing but a session.
 * Every /api/admin/body-assessments/[id] handler now starts with
 * staffAssessmentAccess.
 */

jest.mock("@/lib/db", () => ({
  prisma: { bodyAssessment: { findUnique: jest.fn() } },
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
import { staffAssessmentAccess } from "@/lib/body-assessment-access";

const assessments = (prisma as any).bodyAssessment;
const actorMock = getActor as jest.Mock;
const request = new NextRequest("http://localhost/api/admin/body-assessments/ba1");

const actor = (over: Partial<Actor>): Actor => ({
  userId: "u1",
  role: "THERAPIST",
  clinicId: "clinicA",
  isImpersonating: false,
  ...over,
});

async function outcome(result: Awaited<ReturnType<typeof staffAssessmentAccess>>) {
  return result.response
    ? { status: result.response.status, body: await result.response.json() }
    : { status: "ok" as const };
}

beforeEach(() => jest.resetAllMocks());

describe("staffAssessmentAccess", () => {
  it("rejects a request without an authenticated user", async () => {
    actorMock.mockResolvedValue(null);
    expect(await outcome(await staffAssessmentAccess(request, "ba1"))).toMatchObject({ status: 401 });
  });

  it("keeps patients out, even for their own assessment", async () => {
    actorMock.mockResolvedValue(actor({ role: "PATIENT" }));
    assessments.findUnique.mockResolvedValue({ clinicId: "clinicA" });
    expect(await outcome(await staffAssessmentAccess(request, "ba1"))).toMatchObject({ status: 403 });
  });

  it("answers another tenant's assessment exactly like a missing one", async () => {
    actorMock.mockResolvedValue(actor({}));

    assessments.findUnique.mockResolvedValue(null);
    const missing = await outcome(await staffAssessmentAccess(request, "nope"));

    assessments.findUnique.mockResolvedValue({ clinicId: "clinicB" });
    const foreign = await outcome(await staffAssessmentAccess(request, "ba1"));

    expect(missing).toEqual({ status: 404, body: { error: "Assessment not found" } });
    expect(foreign).toEqual(missing);
  });

  it("lets staff of the assessment's tenant through", async () => {
    const staff = actor({});
    actorMock.mockResolvedValue(staff);
    assessments.findUnique.mockResolvedValue({ clinicId: "clinicA" });

    const result = await staffAssessmentAccess(request, "ba1");

    expect(result.response).toBeUndefined();
    expect(result.actor).toEqual(staff);
  });

  it("denies staff whose tenant could not be resolved", async () => {
    actorMock.mockResolvedValue(actor({ role: "SUPERADMIN", clinicId: null }));
    assessments.findUnique.mockResolvedValue({ clinicId: "clinicA" });
    expect(await outcome(await staffAssessmentAccess(request, "ba1"))).toMatchObject({ status: 404 });
  });
});
