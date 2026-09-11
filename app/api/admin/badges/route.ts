export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, assertPatientAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { computeSignals, earnedBadges } from "@/lib/badges";

// GET ?studentId= — a student's badges, for the trainer's view. Staff of the
// tenant only; the student must belong to that tenant (404 otherwise).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const studentId = request.nextUrl.searchParams.get("studentId");
    if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    await assertPatientAccess(actor, studentId); // 404 if not a student of this tenant

    const signals = await computeSignals(studentId, clinicId);
    return NextResponse.json({ badges: earnedBadges(signals) });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/badges] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
