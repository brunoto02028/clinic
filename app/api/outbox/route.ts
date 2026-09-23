// GET /api/outbox — messages the automation wants to send, waiting for a
// human (activity 072, T-4). Staff only: every row names a patient.
import { NextRequest, NextResponse } from "next/server";
import { OutboundStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // The signed-in staff member, not the patient they may be viewing as.
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

  const asked = request.nextUrl.searchParams.get("status");
  if (asked && !Object.values(OutboundStatus).includes(asked as OutboundStatus)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  const status = (asked as OutboundStatus) || undefined;

  const messages = await prisma.outboundMessage.findMany({
    where: { clinicId: actor.clinicId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, ruleCode: true, channel: true, status: true, holdReason: true,
      subjectEn: true, subjectPt: true, bodyEn: true, bodyPt: true,
      createdAt: true, approvedAt: true, sentAt: true, providerError: true,
      patient: { select: { id: true, firstName: true, lastName: true, preferredLocale: true } },
      approvedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const waiting = await prisma.outboundMessage.count({
    where: { clinicId: actor.clinicId, status: OutboundStatus.AWAITING_APPROVAL },
  });

  return NextResponse.json({ messages, waiting });
}
