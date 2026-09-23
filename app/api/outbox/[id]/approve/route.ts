// POST /api/outbox/[id]/approve — the only path from queue to inbox
// (activity 072, T-4).
//
// The body carries the hash the approver was shown. Approval is of a specific
// text, not of a row id: if the render no longer matches, this refuses rather
// than sending something nobody read.
import { NextRequest, NextResponse } from "next/server";
import { OutboundStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { deliverMessage, renderQueuedMessage } from "@/lib/automation/outbox";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const hash = typeof body?.hash === "string" ? body.hash : null;
  if (!hash) return NextResponse.json({ error: "Approve from the preview" }, { status: 400 });

  const msg = await prisma.outboundMessage.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    include: { patient: { select: { preferredLocale: true, clinicId: true } } },
  });
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (msg.status !== OutboundStatus.AWAITING_APPROVAL) {
    return NextResponse.json(
      { error: `This message is already ${msg.status}` },
      { status: 409 }
    );
  }

  const rendered = await renderQueuedMessage(msg);
  if (rendered.hash !== hash) {
    return NextResponse.json(
      { error: "The message changed since you previewed it. Read it again." },
      { status: 409 }
    );
  }

  // Scoped by status in the same statement, so two approvers cannot both win.
  const claimed = await prisma.outboundMessage.updateMany({
    where: { id: msg.id, clinicId: actor.clinicId, status: OutboundStatus.AWAITING_APPROVAL },
    data: {
      status: OutboundStatus.APPROVED,
      approvedById: actor.userId,
      approvedAt: new Date(),
      approvedHash: rendered.hash,
    },
  });
  if (claimed.count === 0) {
    return NextResponse.json({ error: "Someone else got there first" }, { status: 409 });
  }

  // Try now. Quiet hours or the daily cap hold it — approved, not sent, with
  // the reason on the row; the dispatcher finishes it later.
  const result = await deliverMessage(msg.id);
  return NextResponse.json({ ok: true, ...result });
}
