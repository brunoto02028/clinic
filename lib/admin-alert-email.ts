import { sendEmail } from "@/lib/email";
import { getAdminNotificationEmail, escapeHtml } from "@/lib/admin-notify-email";

/**
 * One shared template + sender for every "dedicated admin alert" added in
 * activity 37 (new signup, high blood pressure, patient-cancelled, body
 * assessment, foot scan, payments, consent) — previously each event
 * hand-rolled a near-identical ~15-line HTML block, which code review
 * flagged both for the maintenance cost (a branding tweak needs 9 edits)
 * and because none of them escaped patient-controlled values before
 * interpolating them into the HTML (a real XSS surface — the signup one is
 * reachable with no authentication at all).
 */
export interface AdminAlertRow {
  label: string;
  value: string;
}

export async function sendAdminAlert({
  clinicId,
  subject,
  title,
  intro,
  rows = [],
  ctaUrl,
  ctaLabel = "View Patient Profile",
  accentColor = "#4F7361",
}: {
  clinicId?: string | null;
  subject: string;
  title: string;
  /** Already-safe HTML fragment (may contain <strong> etc. around
   * escaped values) — build it with escapeHtml() on any dynamic part. */
  intro: string;
  rows?: AdminAlertRow[];
  ctaUrl?: string;
  ctaLabel?: string;
  accentColor?: string;
}): Promise<void> {
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:140px;">${escapeHtml(r.label)}</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:600;">${escapeHtml(r.value)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">${escapeHtml(title)}</h2>
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">${intro}</p>
      ${rows.length > 0 ? `<div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin:0 0 20px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rowsHtml}</table></div>` : ""}
      ${ctaUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${accentColor};color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${escapeHtml(ctaLabel)}</a></div>` : ""}
    </div>`;

  await sendEmail({
    to: await getAdminNotificationEmail(clinicId ?? null),
    subject,
    html,
  });
}
