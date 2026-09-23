// GET /api/outbox/[id]/preview — exactly what would be sent: the BPR layout,
// both languages, and the hash the approval is bound to (activity 072, T-4).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { renderPatientEmail } from "@/lib/patient-email";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(request);
  if (!actor) return NextResponse.json({ error: "Staff only" }, { status: 403 });
  if (!actor.clinicId) return NextResponse.json({ error: "No clinic in context" }, { status: 403 });

  const msg = await prisma.outboundMessage.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    include: { patient: { select: { preferredLocale: true, clinicId: true } } },
  });
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const rendered = await renderPatientEmail(msg.patient, {
    subjectEn: msg.subjectEn, subjectPt: msg.subjectPt,
    bodyEn: msg.bodyEn, bodyPt: msg.bodyPt, language: "both",
  });

  return NextResponse.json({
    subject: rendered.subject, html: rendered.html, locale: rendered.locale, hash: rendered.hash,
  });
}
