import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { getOnboardingPending, ONBOARDING_REMINDER_ACTION } from "@/lib/onboarding-reminder";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

// POST — manual "send now" for one patient's onboarding reminder. Writes
// the same AuditLog dedupe row the cron does (48h window), so the next
// daily cron run won't remind this patient again the same day.
export async function POST(req: NextRequest) {
  const { patientId } = await req.json().catch(() => ({}));
  if (!patientId) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

  const access = await staffPatientAccess(req, patientId);
  if (access.response) return access.response;

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const already = await prisma.auditLog.findFirst({
    where: { userId: patientId, action: ONBOARDING_REMINDER_ACTION, createdAt: { gte: twoDaysAgo } },
    select: { id: true },
  });
  if (already) return NextResponse.json({ sent: false, reason: "already_sent_recently" });

  const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true } });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const pending = await getOnboardingPending(patientId);
  if (!pending.anyPending) return NextResponse.json({ sent: false, reason: "nothing_pending" });

  const result = await notifyPatient({
    patientId,
    plainMessage: "",
    onboardingPending: pending,
  });
  await logAudit({
    userId: patientId,
    userEmail: "",
    userRole: "PATIENT",
    action: ONBOARDING_REMINDER_ACTION,
    entity: "User",
    entityId: patientId,
    description: `Onboarding reminder sent to ${patient.firstName} ${patient.lastName} (manual send)`,
  });

  return NextResponse.json({ sent: result.success, channel: result.channel });
}
