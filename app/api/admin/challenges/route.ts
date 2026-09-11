export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertTrainingAccess } from "@/lib/workout-access";
import { validateChallenge, type ChallengeInput } from "@/lib/challenges";
import type { ChallengeMetric } from "@prisma/client";

// GET — the studio's challenges with participant counts.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertTrainingAccess(actor);

    const challenges = await prisma.challenge.findMany({
      where: { ...tenantWhere(actor) },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { participants: true } } },
    });
    return NextResponse.json(challenges);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/challenges] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — create a studio-wide challenge.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertTrainingAccess(actor);

    const body = await request.json().catch(() => null);
    const input: ChallengeInput = {
      title: typeof body?.title === "string" ? body.title.trim() : "",
      metric: body?.metric as ChallengeMetric,
      target: Number(body?.target),
      startsAt: body?.startsAt,
      endsAt: body?.endsAt,
    };
    const vErr = validateChallenge(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    const challenge = await prisma.challenge.create({
      data: {
        clinicId,
        trainerId: actor.userId,
        title: input.title,
        description: body?.description ?? null,
        metric: input.metric,
        target: input.target,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
      },
    });
    return NextResponse.json(challenge, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/challenges] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not create the challenge" }, { status: 500 });
  }
}
