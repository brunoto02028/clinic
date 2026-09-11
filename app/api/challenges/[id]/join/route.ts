export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentTrainingAccess } from "@/lib/workout-access";

// POST — the student joins a challenge (idempotent via @@unique). The challenge
// must belong to the student's own studio and be ACTIVE.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);

    const challenge = await prisma.challenge.findUnique({ where: { id: params.id } });
    if (!challenge || challenge.clinicId !== actor.clinicId || challenge.status !== "ACTIVE") {
      throw new AccessError(404, "Not found");
    }

    const participant = await prisma.challengeParticipant.upsert({
      where: { challengeId_studentId: { challengeId: challenge.id, studentId: actor.userId } },
      create: { challengeId: challenge.id, clinicId: challenge.clinicId, studentId: actor.userId },
      update: {},
    });
    return NextResponse.json(participant, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[challenges/[id]/join] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not join the challenge" }, { status: 500 });
  }
}

// DELETE — leave the challenge.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentTrainingAccess(actor);
    await prisma.challengeParticipant.deleteMany({ where: { challengeId: params.id, studentId: actor.userId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[challenges/[id]/join] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not leave the challenge" }, { status: 500 });
  }
}
