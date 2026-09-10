export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentTrainingAccess } from "@/lib/workout-access";

// GET — the signed-in student's own active workouts, with exercises + video.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(workouts);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[workouts] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
