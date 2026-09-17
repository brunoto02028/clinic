import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";
import { REMINDER_MESSAGE_EN, REMINDER_MESSAGE_PT, REMINDER_ACTION } from "@/lib/daily-adherence-email";

export const dynamic = "force-dynamic";

// POST — manual "send now" for one patient's daily-adherence reminder
// (activity 49 follow-up: waiting for 21h wasn't always what the clinic
// wanted). Writes the same AuditLog dedupe row the cron does, so the 21h
// run won't remind this patient again today, and running this twice today
// is a no-op the second time.
export async function POST(req: NextRequest) {
  const { patientId } = await req.json().catch(() => ({}));
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const already = await prisma.auditLog.findFirst({
    where: { userId: patientId, action: REMINDER_ACTION, createdAt: { gte: dayStart } },
    select: { id: true },
  });
  if (already) return NextResponse.json({ sent: false, reason: "already_sent_today" });

  const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const result = await notifyPatient({
    patientId,
    plainMessage: REMINDER_MESSAGE_EN,
    plainMessagePt: REMINDER_MESSAGE_PT,
  });
  await logAudit({
    userId: patientId,
    userEmail: "",
    userRole: "PATIENT",
    action: REMINDER_ACTION,
    entity: "User",
    entityId: patientId,
    description: `Daily adherence reminder sent to ${patient.firstName} ${patient.lastName} (manual send)`,
  });

  return NextResponse.json({ sent: result.success, channel: result.channel });
}
