export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentTrainingAccess } from "@/lib/workout-access";
import { leaderboard } from "@/lib/challenges";

// GET — a challenge in the student's studio: leaderboard + the student's own
// progress. Persists completedAt idempotently on the student's own read (G5).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);

    const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
    if (!challenge || challenge.clinicId !== actor.clinicId) throw new AccessError(404, "Not found");

    const participants = await prisma.challengeParticipant.findMany({
      where: { challengeId: challenge.id },
      select: { studentId: true, joinedAt: true, completedAt: true, student: { select: { firstName: true, lastName: true } } },
    });
    const board = await leaderboard(challenge, participants);

    const mine = board.find((e) => e.studentId === actor.userId) || null;

    // G5 — idempotent completion write, only on the student's own read.
    if (mine && mine.progress >= challenge.target) {
      await prisma.challengeParticipant.updateMany({
        where: { challengeId: challenge.id, studentId: actor.userId, completedAt: null },
        data: { completedAt: new Date() },
      });
    }

    return NextResponse.json({ challenge, leaderboard: board, mine });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[challenges/[id]] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
