// "Weekly closing" — a manual, once-a-week touchpoint (activity 52) distinct
// from the daily reminders in daily-adherence-email.ts: it doesn't list
// missing items, it just asks the patient to either mark what they already
// did or explain in Messages what they couldn't do. Sent as a real
// ClinicMessage (shows up in the patient's Messages tab, where the reply
// belongs), not just a notification ping.

export const WEEKLY_CLOSING_TITLE_EN = "Weekly Check-in";
export const WEEKLY_CLOSING_TITLE_PT = "Fechamento da Semana";

export const WEEKLY_CLOSING_ACTION_EN = "WEEKLY_CLOSING_SENT_EN";
export const WEEKLY_CLOSING_ACTION_PT = "WEEKLY_CLOSING_SENT_PT";

const WEEKLY_CLOSING_BODY_EN = (firstName: string) => `Hi ${firstName}! Weekly check-in on your rehab plan.

A few items on your plan haven't been marked as done in the system yet. If you've already done any of these exercises/self-care, please open the app and mark them as complete — this is important so I can track your progress correctly.

If something genuinely wasn't possible this week, let me know briefly here in Messages why — pain, lack of time, unsure how to do it, etc. That helps me adjust the plan if needed.

Any questions, I'm here!`;

const WEEKLY_CLOSING_BODY_PT = (firstName: string) => `Olá ${firstName}! Fechamento da semana do seu plano de reabilitação.

Notei que alguns itens ainda não foram marcados como feitos no sistema. Se você já fez algum desses exercícios/cuidados, entra no app e marca como concluído — isso é essencial pra eu acompanhar sua evolução corretamente.

Se algum item realmente não foi possível fazer, me conta rapidinho por aqui (em Mensagens) o motivo — dor, falta de tempo, dúvida em como fazer, etc. Isso me ajuda a ajustar o plano se precisar.

Qualquer dúvida, estou à disposição!`;

export function buildWeeklyClosingText(firstName: string, locale: "en" | "pt"): string {
  return locale === "pt" ? WEEKLY_CLOSING_BODY_PT(firstName) : WEEKLY_CLOSING_BODY_EN(firstName);
}

/** Monday 00:00 (server local time) of the week `date` falls in — same
 * unsophisticated local-time day math as startOfDay() in
 * patient-daily-adherence.ts, just extended back to the start of the week. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}
