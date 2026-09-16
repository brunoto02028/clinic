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
      const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      // Table-based cards, not <ul>/<li> — the safe pattern for HTML e-mail:
      // list-style resets get stripped by enough clients (Gmail's mobile
      // apps among them) that a comma-joined string was all that was left,
      // which is exactly what looked wrong in the first version of this.
      const missingCard = (p: { name: string; missingItems: { title: string }[] }) => `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
          <tr><td style="background-color:#FBEEEC;border-left:3px solid #A85A4B;border-radius:8px;padding:14px 16px;">
            <p style="margin:0 0 8px;color:#20242D;font-size:15px;font-weight:700;">${escapeHtml(p.name)}</p>
            ${p.missingItems.map((i) => `<p style="margin:0 0 4px;color:#8A4438;font-size:13px;">&bull;&nbsp; ${escapeHtml(i.title)}</p>`).join("")}
          </td></tr>
        </table>`;
      const completedRow = (p: { name: string }) => `
        <tr><td style="padding:8px 16px;color:#20242D;font-size:14px;">&#9989;&nbsp; ${escapeHtml(p.name)}</td></tr>`;
      const pill = (label: string, bg: string, fg: string) =>
        `<span style="display:inline-block;background-color:${bg};color:${fg};font-weight:700;font-size:14px;padding:6px 14px;border-radius:999px;margin:0 8px 8px 0;">${label}</span>`;
      const content = `
        <h2 style="color:#20242D;font-size:20px;margin:0 0 2px;">${escapeHtml(clinic.name)}</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">Today's adherence &middot; ${dateLabel}</p>
        <div style="margin:0 0 24px;">
          ${pill(`${completed.length} completed everything`, "#EDF3EF", "#3B5A49")}
          ${pill(`${missing.length} missing something`, "#FBEEEC", "#8A4438")}
        </div>
        ${missing.length ? `
          <h3 style="color:#20242D;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 10px;">Missing something</h3>
          ${missing.map(missingCard).join("")}
        ` : ""}
        ${completed.length ? `
          <h3 style="color:#20242D;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;margin:24px 0 10px;">Completed everything</h3>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F4F1;border-radius:8px;">${completed.map(completedRow).join("")}</table>
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
