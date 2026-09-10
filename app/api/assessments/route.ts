export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentTrainingAccess } from "@/lib/workout-access";

// GET — the signed-in student's own assessments (web portal).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    const assessments = await prisma.studentAssessment.findMany({
      where: { studentId: actor.userId },
      include: { photos: true },
      orderBy: { performedAt: "desc" },
    });
    return NextResponse.json(assessments);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[assessments] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
