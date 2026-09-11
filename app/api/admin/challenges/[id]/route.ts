export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { validateChallenge, leaderboard, progressForMany, type ChallengeInput } from "@/lib/challenges";
import type { ChallengeMetric, ChallengeStatus } from "@prisma/client";

const STATUSES: ChallengeStatus[] = ["ACTIVE", "ARCHIVED"];

async function loadOwned(actor: Awaited<ReturnType<typeof getActor>>, id: string) {
  const c = await prisma.challenge.findUnique({ where: { id } });
  assertRecordAccess(actor!, { clinicId: c?.clinicId ?? null });
  return c!;
}

// GET — a challenge with its leaderboard (one query for all participants).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    const challenge = await loadOwned(actor, params.id);

    const participants = await prisma.challengeParticipant.findMany({
      where: { challengeId: challenge.id },
      select: { studentId: true, joinedAt: true, completedAt: true, student: { select: { firstName: true, lastName: true } } },
    });
    const board = await leaderboard(challenge, participants);
    return NextResponse.json({ challenge, leaderboard: board });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/challenges/[id]] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// PATCH — edit fields/status. When target or window changes, clear a now-stale
// completedAt from participants who no longer meet the target (G8).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);
    const challenge = await loadOwned(actor, params.id);

    const body = await request.json().catch(() => null);
    const next: ChallengeInput = {
      title: typeof body?.title === "string" && body.title.trim() ? body.title.trim() : challenge.title,
      metric: (body?.metric as ChallengeMetric) || challenge.metric,
      target: typeof body?.target === "number" ? body.target : challenge.target,
      startsAt: body?.startsAt ?? challenge.startsAt,
      endsAt: body?.endsAt ?? challenge.endsAt,
    };
    const vErr = validateChallenge(next);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const status: ChallengeStatus | undefined = STATUSES.includes(body?.status) ? body.status : undefined;
    const targetOrWindowChanged =
      next.target !== challenge.target ||
      new Date(next.startsAt).getTime() !== challenge.startsAt.getTime() ||
      new Date(next.endsAt).getTime() !== challenge.endsAt.getTime() ||
      next.metric !== challenge.metric;

    const updated = await prisma.challenge.update({
      where: { id: challenge.id },
      data: {
        title: next.title,
        description: "description" in (body || {}) ? body.description ?? null : undefined,
        metric: next.metric,
        target: next.target,
        startsAt: new Date(next.startsAt),
        endsAt: new Date(next.endsAt),
        ...(status ? { status } : {}),
      },
    });

    // G8 — recompute against the new target/window; clear stale completions.
    if (targetOrWindowChanged) {
      const parts = await prisma.challengeParticipant.findMany({
        where: { challengeId: challenge.id, completedAt: { not: null } },
        select: { studentId: true },
      });
      if (parts.length) {
        const progress = await progressForMany(updated.metric, parts.map((p) => p.studentId), clinicId, updated.startsAt, updated.endsAt);
        const stale = parts.filter((p) => (progress.get(p.studentId) || 0) < updated.target).map((p) => p.studentId);
        if (stale.length) {
          await prisma.challengeParticipant.updateMany({
            where: { challengeId: challenge.id, studentId: { in: stale } },
            data: { completedAt: null },
          });
        }
      }
    }
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/challenges/[id]] PATCH error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not update the challenge" }, { status: 500 });
  }
}

// DELETE — remove the challenge (cascades to participants).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);
    await loadOwned(actor, params.id);
    await prisma.challenge.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/challenges/[id]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not delete the challenge" }, { status: 500 });
  }
}
