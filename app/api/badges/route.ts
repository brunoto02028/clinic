export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentTrainingAccess } from "@/lib/workout-access";
import { computeSignals, earnedBadges } from "@/lib/badges";

// GET — the signed-in student's badges (earned + progress), derived on-read.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    if (!actor.clinicId) return NextResponse.json({ badges: [] });

    const signals = await computeSignals(actor.userId, actor.clinicId);
    return NextResponse.json({ badges: earnedBadges(signals) });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[badges] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
