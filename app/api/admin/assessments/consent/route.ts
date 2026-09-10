export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError, assertPatientAccess } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";

// GET — the student's current photo-consent timestamp (or null).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    const student = await assertPatientAccess(actor, studentId);
    const u = await prisma.user.findUnique({ where: { id: student.id }, select: { photoConsentAt: true } });
    return NextResponse.json({ photoConsentAt: u?.photoConsentAt ?? null });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/consent] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — record that the student consented to progress photos (in-person, by
// the trainer). Idempotent-ish: stamps photoConsentAt now. Staff, tenant-scoped.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    const body = await request.json().catch(() => null);
    const studentId = body?.studentId;
    // Grant only on an explicit boolean true (or when omitted — this endpoint's
    // default action is to grant). Anything else (false, "false", 0, null) revokes.
    const granted = body?.granted === undefined || body?.granted === true;
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    const student = await assertPatientAccess(actor, studentId);

    const updated = await prisma.user.update({
      where: { id: student.id },
      data: { photoConsentAt: granted ? new Date() : null },
      select: { id: true, photoConsentAt: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/assessments/consent] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
