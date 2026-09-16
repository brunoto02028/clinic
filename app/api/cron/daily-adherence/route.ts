import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { notifyPatient } from "@/lib/notify-patient";
import { sendEmail } from "@/lib/email";
import { wrapInLayout } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/admin-notify-email";
import { logAudit } from "@/lib/system-logger";

export const dynamic = "force-dynamic";

const REPORT_TO = "admin@bpr.clinic";
const REMINDER_ACTION = "DAILY_ADHERENCE_REMINDER_SENT";
const REPORT_ACTION = "DAILY_ADHERENCE_REPORT_SENT";

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
        plainMessage: "You still have activities left in today's plan — a couple of minutes now keeps your progress on track.",
        plainMessagePt: "Ainda faltam atividades do seu plano de hoje — alguns minutos agora mantêm seu progresso em dia.",
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

    const reportAlreadySent = await prisma.auditLog.findFirst({
      where: { entityId: clinic.id, action: REPORT_ACTION, createdAt: { gte: dayStart } },
      select: { id: true },
    });
    let reportSent = false;
    if (!reportAlreadySent) {
      const missingItem = (p: { name: string; missingItems: { title: string }[] }) => `
        <li style="margin:0 0 10px;">
          <span style="color:#20242D;font-weight:600;">${escapeHtml(p.name)}</span><br>
          <span style="color:#A85A4B;font-size:13px;">${escapeHtml(p.missingItems.map((i) => i.title).join(", "))}</span>
        </li>`;
      const completedItem = (p: { name: string }) =>
        `<li style="color:#20242D;margin:0 0 6px;">${escapeHtml(p.name)}</li>`;
      const content = `
        <h2 style="color:#20242D;font-size:20px;margin:0 0 4px;">${escapeHtml(clinic.name)}</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Today's adherence</p>
        <p style="font-size:15px;margin:0 0 20px;">
          <span style="color:#4F7361;font-weight:700;">${completed.length} completed everything</span>
          &nbsp;·&nbsp;
          <span style="color:#A85A4B;font-weight:700;">${missing.length} did not</span>
        </p>
        ${missing.length ? `
          <h3 style="color:#20242D;font-size:15px;margin:0 0 10px;">Missing something</h3>
          <ul style="list-style:none;padding:0;margin:0 0 24px;">${missing.map(missingItem).join("")}</ul>
        ` : ""}
        ${completed.length ? `
          <h3 style="color:#20242D;font-size:15px;margin:0 0 10px;">Completed everything</h3>
          <ul style="list-style:none;padding:0;margin:0;">${completed.map(completedItem).join("")}</ul>
        ` : ""}
      `;
      const html = await wrapInLayout(
        content,
        `${completed.length} completed, ${missing.length} missing today`,
        "en-GB",
        clinic.id
      );
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
