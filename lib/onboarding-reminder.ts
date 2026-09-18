import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/admin-notify-email";
import { wrapInLayout } from "@/lib/email-templates";

// Onboarding pending items — profile, screening, consent — same three
// checks the "Welcome to BPR!" checklist on the patient's own dashboard
// already uses (app/dashboard/page.tsx), plus a reminder every 2 days
// while any stay unfinished. Every send is logged via AuditLog, same
// pattern as the daily-adherence reminders (specs/049-relatorio-adesao-diaria).

export const ONBOARDING_REMINDER_ACTION = "ONBOARDING_REMINDER_SENT";
const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

export interface OnboardingPending {
  profileIncomplete: boolean;
  screeningMissing: boolean;
  consentMissing: boolean;
  anyPending: boolean;
}

export async function getOnboardingPending(patientId: string): Promise<OnboardingPending> {
  const [user, screening] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientId },
      select: { dateOfBirth: true, address: true, consentAcceptedAt: true, clinic: { select: { type: true } } },
    }),
    prisma.medicalScreening.findUnique({ where: { userId: patientId }, select: { isSubmitted: true } }),
  ]);
  const profileIncomplete = !user?.dateOfBirth || !user?.address;
  // A studio's students have no medical screening — it's a clinic step and
  // its pages are blocked for studios (activity 55, T-4).
  const isStudio = user?.clinic?.type === "PERSONAL_TRAINER";
  const screeningMissing = !isStudio && screening?.isSubmitted !== true;
  const consentMissing = !user?.consentAcceptedAt;
  return {
    profileIncomplete,
    screeningMissing,
    consentMissing,
    anyPending: profileIncomplete || screeningMissing || consentMissing,
  };
}

function pendingLabels(p: OnboardingPending, isPt: boolean): string[] {
  const labels: string[] = [];
  if (p.profileIncomplete) labels.push(isPt ? "Completar o perfil" : "Complete your profile");
  if (p.screeningMissing) labels.push(isPt ? "Enviar a triagem médica" : "Submit your medical screening");
  if (p.consentMissing) labels.push(isPt ? "Aceitar os termos de consentimento" : "Accept the consent terms");
  return labels;
}

function plainMessage(p: OnboardingPending, isPt: boolean): string {
  const list = pendingLabels(p, isPt).join(" · ");
  return isPt
    ? `Ainda falta: ${list}. Leva só alguns minutos e é importante pra gente cuidar bem do seu tratamento.`
    : `Still pending: ${list}. It only takes a couple of minutes and helps us take good care of your treatment.`;
}

/** Plain-text version, for the WhatsApp/SMS/Telegram channels. */
export function buildOnboardingReminderText(p: OnboardingPending) {
  return { en: plainMessage(p, false), pt: plainMessage(p, true) };
}

/** Shared by the real send (notify-patient's e-mail fallback) and the admin preview. */
export async function buildOnboardingReminderEmail(
  firstName: string,
  p: OnboardingPending,
  locale: string,
  clinicId: string | null
) {
  const isPt = locale === "pt-BR" || locale.startsWith("pt");
  const cta = isPt ? "Completar Meu Cadastro →" : "Complete My Setup →";
  const itemsHtml = pendingLabels(p, isPt)
    .map((t) => `<p style="margin:0 0 4px;color:#8A4438;font-size:13px;">&bull;&nbsp; ${escapeHtml(t)}</p>`)
    .join("");
  const content = `
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${isPt ? "Olá" : "Hi"} ${escapeHtml(firstName)},</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">${isPt ? "Ainda falta:" : "Still pending:"}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background-color:#FBEEEC;border-left:3px solid #A85A4B;border-radius:8px;padding:14px 16px;">${itemsHtml}</td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">
      ${isPt
        ? "Leva só alguns minutos e é importante pra gente cuidar bem do seu tratamento."
        : "It only takes a couple of minutes and helps us take good care of your treatment."}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
      <a href="${BASE_URL}/dashboard" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#4F7361;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${cta}</a>
    </td></tr></table>
  `;
  return wrapInLayout(content, plainMessage(p, isPt).slice(0, 100), locale, clinicId);
}
