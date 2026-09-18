import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { buildDailyAdherenceEmail, REPORT_ACTION } from "@/lib/daily-adherence-email";
import { sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

const REPORT_TO = "admin@bpr.clinic";

// POST /api/cron/daily-report — once a day (intended: 21h clinic time, see
// specs/049-relatorio-adesao-diaria): e-mails the clinic a completed/missing
// summary. Split out from /api/cron/daily-adherence (17/09/2026) so this can
// stay on an automatic schedule while patient-facing reminders stay
// manual-only — this route never touches a patient, only sends to REPORT_TO.
// Call via cron: curl -X POST https://bpr.clinic/api/cron/daily-report?key=SECRET
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Manual override for a missed run or testing a template change without
  // waiting for tomorrow — re-sends the report even if already sent today.
  const force = req.nextUrl.searchParams.get("force") === "true";

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const clinics = await prisma.clinic.findMany({ where: { isActive: true }, select: { id: true, name: true } });

  const results: { clinicId: string; completed: number; missing: number; reportSent: boolean }[] = [];

  for (const clinic of clinics) {
    const { completed, missing } = await getClinicDailyAdherence(clinic.id, now);
    if (completed.length === 0 && missing.length === 0) continue; // nothing scheduled anywhere today

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

    results.push({ clinicId: clinic.id, completed: completed.length, missing: missing.length, reportSent });
  }

  return NextResponse.json({ results });
}
