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

// GET — the signed-in student's own active workouts (mobile Bearer).
export async function GET(request: NextRequest) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);

    const workouts = await prisma.workout.findMany({
      where: { studentId: actor.userId, isActive: true },
      include: {
        exercises: {
          orderBy: { order: "asc" },
          include: {
            exercise: { select: { id: true, name: true, namePt: true, videoUrl: true, thumbnailUrl: true } },
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return corsJson(workouts);
  } catch (err) {
    if (err instanceof AccessError) return corsJson({ error: err.message }, { status: err.status });
    console.error("[mobile/workouts] GET error:", (err as any)?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
