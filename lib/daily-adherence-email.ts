import { wrapInLayout } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/admin-notify-email";
import { renderTemplate } from "@/lib/reminder-templates";

export type AdherencePatientSummary = { name: string; missingItems: { title: string }[] };

// Shared with the preview route so what's shown always matches what the
// cron actually sends via notifyPatient().
//
// "Still left" reads as "not done" — a patient who did the exercise but
// forgot to tap the checkbox gets a message that sounds like the clinic
// thinks they did nothing. Every variant below (today/yesterday, plain and
// HTML) explicitly separates "marked in the app" from "physically done" so
// the ask is clear either way: mark it if it's done, say why if it isn't
// (activity 60's weekly closing made the same fix; this brings the daily
// reminders in line with it).
export const REMINDER_MESSAGE_EN = "You still have activities left in today's plan — a couple of minutes now keeps your progress on track. Already done some? Just mark them in the app.";
export const REMINDER_MESSAGE_PT = "Ainda faltam atividades do seu plano de hoje — alguns minutos agora mantêm seu progresso em dia. Já fez algumas? É só marcar no app.";

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

function todayPlainMessage(missingTitles: string[], isPt: boolean, customTemplate?: string | null): string {
  if (missingTitles.length === 0) return isPt ? REMINDER_MESSAGE_PT : REMINDER_MESSAGE_EN;
  if (customTemplate) return renderTemplate(customTemplate, { items: missingTitles.join(" · ") });
  const list = missingTitles.join(" · ");
  return isPt
    ? `Ainda não marcado hoje: ${list}. Já fez algum desses? É só marcar no app — isso é o que mantém seu histórico certinho. Alguns minutos agora mantêm seu progresso em dia.`
    : `Not marked yet today: ${list}. Already done any of these? Just mark them in the app — that's what keeps your records accurate. A couple of minutes now keeps your progress on track.`;
}

/** Plain-text version, for the WhatsApp/SMS/Telegram channels. `custom` is
 * the clinic's admin-edited template (activity 62, T-5), per language —
 * empty/missing falls back to the hardcoded copy above. */
export function buildTodayReminderText(missingTitles: string[], custom?: { en?: string; pt?: string }) {
  return {
    en: todayPlainMessage(missingTitles, false, custom?.en),
    pt: todayPlainMessage(missingTitles, true, custom?.pt),
  };
}

// Shared by the real send (notify-patient's e-mail fallback) and the admin
// preview (app/api/admin/adherence/preview-patient-email) — same reason as
// buildDailyAdherenceEmail above. Used to be a generic "you still have
// activities left" with no detail — named misses, like the yesterday
// follow-up below, so the patient sees exactly what's pending, not just that
// something is.
export async function buildPatientReminderEmail(firstName: string, missingTitles: string[], locale: string, clinicId: string | null, customTemplate?: string | null) {
  const isPt = locale === "pt-BR" || locale.startsWith("pt");
  const cta = isPt ? "Ver Meus Exercícios →" : "View My Exercises →";
  const itemsHtml = missingTitles.map((t) => `<p style="margin:0 0 4px;color:#8A4438;font-size:13px;">&bull;&nbsp; ${escapeHtml(t)}</p>`).join("");
  const body = customTemplate && missingTitles.length
    ? `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${escapeHtml(renderTemplate(customTemplate, { items: missingTitles.join(", ") }))}</p>`
    : missingTitles.length ? `
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">${isPt ? "Ainda não marcado hoje:" : "Not marked yet today:"}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
        <tr><td style="background-color:#FBEEEC;border-left:3px solid #A85A4B;border-radius:8px;padding:14px 16px;">${itemsHtml}</td></tr>
      </table>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
        ${isPt
          ? "Já fez algum desses? É só marcar no app — isso é o que mantém seu histórico certinho."
          : "Already done any of these? Just mark them in the app — that's what keeps your records accurate."}
      </p>
    ` : `
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${isPt ? REMINDER_MESSAGE_PT : REMINDER_MESSAGE_EN}</p>
    `;
  const content = `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${isPt ? "Olá" : "Hi"} ${escapeHtml(firstName)},</p>
    ${body}
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
      <a href="${BASE_URL}/dashboard/treatment" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${cta}</a>
    </td></tr></table>
  `;
  return wrapInLayout(content, todayPlainMessage(missingTitles, isPt, customTemplate).slice(0, 100), locale, clinicId);
}

// ─── Yesterday follow-up — a second, morning touchpoint ────────────────
// Different from the 21h "still time today" reminder: this looks back at
// what didn't get done yesterday, names it, and leads with support rather
// than urgency. Same dedupe pattern (one AuditLog action, once per day),
// same getExpectedToday/getClinicDailyAdherence machinery — they already
// take an arbitrary date, so "yesterday" is just that date minus one day.

export const YESTERDAY_ACTION = "YESTERDAY_FOLLOWUP_SENT";

function yesterdayPlainMessage(missingTitles: string[], isPt: boolean, customTemplate?: string | null): string {
  if (customTemplate) return renderTemplate(customTemplate, { items: missingTitles.join(" · ") });
  const list = missingTitles.join(isPt ? " · " : " · ");
  return isPt
    ? `Ontem ficou sem marcar: ${list}. Se você já fez e só esqueceu de marcar, entra no portal e confirma — isso é importante pro seu acompanhamento. Se algo realmente não deu pra fazer, nos conta o motivo em Mensagens — estamos aqui pra ajudar.`
    : `Yesterday these weren't marked: ${list}. If you already did them and just forgot to check them off, log in and mark them — it matters for tracking your progress. If something genuinely wasn't possible, let us know why in Messages — we're here to help.`;
}

/** Plain-text version, for the WhatsApp/SMS/Telegram channels. `custom` is
 * the clinic's admin-edited template (activity 62, T-5), per language. */
export function buildYesterdayFollowupText(missingTitles: string[], custom?: { en?: string; pt?: string }) {
  return {
    en: yesterdayPlainMessage(missingTitles, false, custom?.en),
    pt: yesterdayPlainMessage(missingTitles, true, custom?.pt),
  };
}

/** Shared by the real send and its admin preview, same reason as the others above. */
export async function buildYesterdayFollowupEmail(
  firstName: string,
  missingTitles: string[],
  locale: string,
  clinicId: string | null,
  customTemplate?: string | null
) {
  const isPt = locale === "pt-BR" || locale.startsWith("pt");
  const cta = isPt ? "Completar Meus Exercícios →" : "Complete My Exercises →";
  const itemsHtml = missingTitles.map((t) => `<p style="margin:0 0 4px;color:#8A4438;font-size:13px;">&bull;&nbsp; ${escapeHtml(t)}</p>`).join("");
  const body = customTemplate
    ? `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${escapeHtml(renderTemplate(customTemplate, { items: missingTitles.join(", ") }))}</p>`
    : `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">${isPt ? "Ontem ficou sem marcar:" : "Yesterday these weren't marked:"}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background-color:#FBEEEC;border-left:3px solid #A85A4B;border-radius:8px;padding:14px 16px;">${itemsHtml}</td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ${isPt
        ? "Se você já fez e só esqueceu de marcar, entra no portal e confirma — isso é importante pro seu acompanhamento. Se algo realmente não deu pra fazer, nos conta o motivo em Mensagens — estamos aqui pra ajudar."
        : "If you already did them and just forgot to check them off, log in and mark them — it matters for tracking your progress. If something genuinely wasn't possible, let us know why in Messages — we're here to help."}
    </p>`;
  const content = `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${isPt ? "Olá" : "Hi"} ${escapeHtml(firstName)},</p>
    ${body}
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
      <a href="${BASE_URL}/dashboard/treatment" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${cta}</a>
    </td></tr></table>
  `;
  return wrapInLayout(content, isPt ? "Precisamos de você por aqui" : "We miss you in your plan", locale, clinicId);
}
