export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentTrainingAccess } from "@/lib/workout-access";
import { progressForMany, currentStreak } from "@/lib/challenges";

// GET — the student's studio's ACTIVE challenges with their own progress + join
// state, plus their consistency streaks. Progress is computed on-read from logs.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    if (!actor.clinicId) return NextResponse.json({ challenges: [], streaks: { workout: 0, meal: 0 } });

    const challenges = await prisma.challenge.findMany({
      where: { clinicId: actor.clinicId, status: "ACTIVE" },
      orderBy: { endsAt: "asc" },
      include: { participants: { where: { studentId: actor.userId }, select: { id: true, completedAt: true } } },
    });

    const items = await Promise.all(
      challenges.map(async (c) => {
        const joined = c.participants.length > 0;
        let progress = 0;
        if (joined) {
          const map = await progressForMany(c.metric, [actor.userId], c.clinicId, c.startsAt, c.endsAt);
          progress = map.get(actor.userId) || 0;
        }
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          metric: c.metric,
          target: c.target,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          joined,
          progress,
          pct: c.target > 0 ? Math.min(1, progress / c.target) : 0,
        };
      })
    );

    const [workout, meal] = await Promise.all([
      currentStreak("workout", actor.userId, actor.clinicId),
      currentStreak("meal", actor.userId, actor.clinicId),
    ]);

    return NextResponse.json({ challenges: items, streaks: { workout, meal } });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[challenges] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
