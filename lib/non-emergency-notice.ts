/**
 * The one sentence that has to be true about this product, said where the
 * patient sees it (activity 074, T-13).
 *
 * The commercial plan lists it among the nine things that must be resolved
 * before selling the first subscription: *"aviso de não emergência no contrato
 * e no app: alertas revisados em horário comercial; em caso de sintomas,
 * procurar GP, 111 ou 999"*. It is a legal requirement, and it is also the
 * honest description of what the clinic does: a therapist reads the alerts
 * during the working day. Without this notice, every alert the app sends
 * carries an implied promise of continuous watching that nobody is making.
 *
 * One text, one version, one place. The version is recorded with the patient's
 * acceptance, so "which wording did they agree to" has an answer later.
 */

export const NON_EMERGENCY_NOTICE_VERSION = "1.0";

export interface NoticeText {
  title: string;
  body: string;
  /** The single line that fits in an e-mail or push footer. */
  short: string;
}

export const NON_EMERGENCY_NOTICE: Record<"en-GB" | "pt-BR", NoticeText> = {
  "en-GB": {
    title: "This is not an emergency service",
    body:
      "Your readings are reviewed by your therapist during business hours, not continuously. " +
      "If you feel unwell — chest pain, breathlessness, severe headache, weakness on one side, " +
      "or anything that frightens you — do not wait for us. Call 999 for an emergency, or 111 " +
      "for urgent advice, or contact your GP.",
    short:
      "Readings are reviewed during business hours, not continuously. For symptoms, call 999 or 111 — do not wait for a reply.",
  },
  "pt-BR": {
    title: "Isto não é um serviço de emergência",
    body:
      "Suas medidas são revisadas pelo seu terapeuta em horário comercial, não continuamente. " +
      "Se você não estiver bem — dor no peito, falta de ar, dor de cabeça forte, fraqueza de um " +
      "lado do corpo, ou qualquer coisa que te assuste — não espere por nós. Ligue para a " +
      "emergência ou procure seu médico agora.",
    short:
      "As medidas são revisadas em horário comercial, não continuamente. Com sintomas, ligue para a emergência — não espere resposta.",
  },
};

export function noticeFor(locale: string | null | undefined): NoticeText {
  return NON_EMERGENCY_NOTICE[locale === "pt-BR" ? "pt-BR" : "en-GB"];
}

/** The footer an alert e-mail carries, as HTML. */
export function noticeEmailFooter(locale: string | null | undefined): string {
  const t = noticeFor(locale);
  return `<p style="color:#6b7280;font-size:12px;line-height:1.5;margin:16px 0 0;">${t.short}</p>`;
}
