import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { buildDailyAdherenceEmail, REMINDER_MESSAGE_EN, REMINDER_MESSAGE_PT, REMINDER_ACTION, REPORT_ACTION } from "@/lib/daily-adherence-email";
import { notifyPatient } from "@/lib/notify-patient";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

const REPORT_TO = "admin@bpr.clinic";

// POST /api/cron/daily-adherence — once a day (intended: 21h clinic time, see
// specs/49-relatorio-adesao-diaria): reminds every patient still missing
// today's activities, and e-mails the clinic a completed/missing summary.
// Call via cron: curl -X POST https://bpr.clinic/api/cron/daily-adherence?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Manual override for a missed run or testing a template change without
  // waiting for tomorrow — re-sends the clinic report even if already sent
  // today. Never re-sends patient reminders; those stay deduped regardless,
  // so this can't spam a patient by being called twice.
  const force = req.nextUrl.searchParams.get("force") === "true";

  // "Today" is computed in the server's own timezone — close enough to the
  // clinic's (Europe/London) for a job meant to fire well away from
  // midnight, but not exact across a DST-shifted boundary. Flagged in the
  // plan (decision 7) as something to tighten once this is running for real.
  const now = new Date();

  const clinics = await prisma.clinic.findMany({ where: { isActive: true }, select: { id: true, name: true } });

  const results: { clinicId: string; completed: number; missing: number; remindersSent: number; reportSent?: boolean }[] = [];

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  for (const clinic of clinics) {
    const { completed, missing } = await getClinicDailyAdherence(clinic.id, now);
    if (completed.length === 0 && missing.length === 0) continue; // nothing scheduled anywhere today

    let remindersSent = 0;
    for (const patient of missing) {
      const already = await prisma.auditLog.findFirst({
        where: { userId: patient.patientId, action: REMINDER_ACTION, createdAt: { gte: dayStart } },
        select: { id: true },
      });
      if (already) continue;

      await notifyPatient({
        patientId: patient.patientId,
        plainMessage: REMINDER_MESSAGE_EN,
        plainMessagePt: REMINDER_MESSAGE_PT,
        useReminderTemplate: true,
      });
      await logAudit({
        userId: patient.patientId,
        userEmail: "",
        userRole: "PATIENT",
        action: REMINDER_ACTION,
        entity: "User",
        entityId: patient.patientId,
        description: `Daily adherence reminder sent to ${patient.name}`,
      });
      remindersSent++;
    }

    const reportAlreadySent = !force && await prisma.auditLog.findFirst({
      where: { entityId: clinic.id, action: REPORT_ACTION, createdAt: { gte: dayStart } },
      select: { id: true },
    });
    let reportSent = false;
    if (!reportAlreadySent) {
      const html = await buildDailyAdherenceEmail(clinic.name, clinic.id, completed, missing, now);
      await sendEmail({
        to: REPORT_TO,
        subject: `${clinic.name}: ${completed.length} completed, ${missing.length} missing today`,
        html,
      });
      await logAudit({
        userId: "system",
        userEmail: "",
        userRole: "SYSTEM",
        action: REPORT_ACTION,
        entity: "Clinic",
        entityId: clinic.id,
        description: `Daily adherence report e-mailed for ${clinic.name}`,
      });
      reportSent = true;
    }

    results.push({ clinicId: clinic.id, completed: completed.length, missing: missing.length, remindersSent, reportSent });
  }

  return NextResponse.json({ results });
}
