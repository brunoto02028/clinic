// POST /api/outbox/[id]/discard — the queue's other exit (activity 072, T-4).
// Who discarded it and when is kept: a message nobody sent should still be a
// decision somebody made.
import { NextRequest, NextResponse } from "next/server";
import { OutboundStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

  const discarded = await prisma.outboundMessage.updateMany({
    where: {
      id: params.id,
      clinicId: actor.clinicId,
      status: { in: [OutboundStatus.AWAITING_APPROVAL, OutboundStatus.APPROVED] },
    },
    data: {
      status: OutboundStatus.DISCARDED,
      approvedById: actor.userId,
      approvedAt: new Date(),
      holdReason: null,
    },
  });

  if (discarded.count === 0) {
    const exists = await prisma.outboundMessage.findFirst({
      where: { id: params.id, clinicId: actor.clinicId },
      select: { status: true },
    });
    if (exists) {
      return NextResponse.json({ error: `Cannot discard a ${exists.status} message` }, { status: 409 });
    }
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
