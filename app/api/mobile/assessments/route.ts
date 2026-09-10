export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { getMobileActor } from "@/lib/mobile-actor";
import { assertStudentTrainingAccess } from "@/lib/workout-access";
import { AccessError } from "@/lib/tenant-access";

export function OPTIONS() {
  return corsPreflight();
}

// GET — the signed-in student's own assessments (mobile Bearer).
export async function GET(request: NextRequest) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    const assessments = await prisma.studentAssessment.findMany({
      where: { studentId: actor.userId },
      include: { photos: true },
      orderBy: { performedAt: "desc" },
    });
    return corsJson(assessments);
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/assessments] GET error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
