import { wrapInLayout } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/admin-notify-email";

export type AdherencePatientSummary = { name: string; missingItems: { title: string }[] };

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
