import { wrapInLayout } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/admin-notify-email";

export type AdherencePatientSummary = { name: string; missingItems: { title: string }[] };

// Shared with the preview route so what's shown always matches what the
// cron actually sends via notifyPatient().
export const REMINDER_MESSAGE_EN = "You still have activities left in today's plan — a couple of minutes now keeps your progress on track.";
export const REMINDER_MESSAGE_PT = "Ainda faltam atividades do seu plano de hoje — alguns minutos agora mantêm seu progresso em dia.";

// Same AuditLog action + dedupe window whether the reminder went out from
// the 21h cron or a manual "Send now" click — a manual send today means the
// cron won't also remind the same patient later, and vice versa.
export const REMINDER_ACTION = "DAILY_ADHERENCE_REMINDER_SENT";
export const REPORT_ACTION = "DAILY_ADHERENCE_REPORT_SENT";

// Shared by the real send (app/api/cron/daily-adherence) and the admin
// preview (app/api/admin/adherence/preview-email) — so what gets eyeballed
// before sending is exactly what the clinic would receive, never a close
// approximation of it.
export async function buildDailyAdherenceEmail(
  clinicName: string,
  clinicId: string,
  completed: AdherencePatientSummary[],
  missing: AdherencePatientSummary[],
  now: Date
) {
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  // Table-based cards, not <ul>/<li> — the safe pattern for HTML e-mail:
  // list-style resets get stripped by enough clients (Gmail's mobile apps
  // among them) that a comma-joined string was all that was left, which is
  // exactly what looked wrong in the first version of this.
  const missingCard = (p: AdherencePatientSummary) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
      <tr><td style="background-color:#FBEEEC;border-left:3px solid #A85A4B;border-radius:8px;padding:14px 16px;">
        <p style="margin:0 0 8px;color:#20242D;font-size:15px;font-weight:700;">${escapeHtml(p.name)}</p>
        ${p.missingItems.map((i) => `<p style="margin:0 0 4px;color:#8A4438;font-size:13px;">&bull;&nbsp; ${escapeHtml(i.title)}</p>`).join("")}
      </td></tr>
    </table>`;
  const completedRow = (p: AdherencePatientSummary) => `
    <tr><td style="padding:8px 16px;color:#20242D;font-size:14px;">&#9989;&nbsp; ${escapeHtml(p.name)}</td></tr>`;
  const pill = (label: string, bg: string, fg: string) =>
    `<span style="display:inline-block;background-color:${bg};color:${fg};font-weight:700;font-size:14px;padding:6px 14px;border-radius:999px;margin:0 8px 8px 0;">${label}</span>`;
  const content = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 2px;">${escapeHtml(clinicName)}</h2>
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
  return wrapInLayout(content, `${completed.length} completed, ${missing.length} missing today`, "en-GB", clinicId);
}

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

// Shared by the real send (notify-patient's e-mail fallback) and the admin
// preview (app/api/admin/adherence/preview-patient-email) — same reason as
// buildDailyAdherenceEmail above. The plain-text reminder had no way back
// into the app at all before this; every other branded e-mail has a button.
export async function buildPatientReminderEmail(firstName: string, locale: string, clinicId: string | null) {
  const isPt = locale === "pt-BR" || locale.startsWith("pt");
  const msg = isPt ? REMINDER_MESSAGE_PT : REMINDER_MESSAGE_EN;
  const cta = isPt ? "Ver Meus Exercícios →" : "View My Exercises →";
  const content = `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${isPt ? "Olá" : "Hi"} ${firstName},<br><br>${msg}</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
      <a href="${BASE_URL}/dashboard/treatment" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${cta}</a>
    </td></tr></table>
  `;
  return wrapInLayout(content, msg.slice(0, 100), locale, clinicId);
}
