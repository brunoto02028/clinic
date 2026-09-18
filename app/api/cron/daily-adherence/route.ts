import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { REMINDER_MESSAGE_EN, REMINDER_MESSAGE_PT, REMINDER_ACTION } from "@/lib/daily-adherence-email";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

// POST /api/cron/daily-adherence — reminds every patient still missing
// today's activities (see specs/049-relatorio-adesao-diaria). The clinic
// summary e-mail used to live here too; split out to /api/cron/daily-report
// on 17/09/2026 so that one can stay on an automatic schedule while this
// one — the one that actually messages a patient — is only ever triggered
// manually via the per-patient "Send now" button, never by a cron.
// Call via cron/manual: curl -X POST https://bpr.clinic/api/cron/daily-adherence?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // "Today" is computed in the server's own timezone — close enough to the
  // clinic's (Europe/London) for a job meant to fire well away from
  // midnight, but not exact across a DST-shifted boundary. Flagged in the
  // plan (decision 7) as something to tighten once this is running for real.
  const now = new Date();

  const clinics = await prisma.clinic.findMany({ where: { isActive: true }, select: { id: true, name: true } });

  const results: { clinicId: string; completed: number; missing: number; remindersSent: number }[] = [];

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
        todayMissingTitles: patient.missingItems.map((i) => i.title),
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

    results.push({ clinicId: clinic.id, completed: completed.length, missing: missing.length, remindersSent });
  }

  return NextResponse.json({ results });
}
