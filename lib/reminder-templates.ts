import { prisma } from "@/lib/db";

// Admin-editable overrides for the reminder/onboarding/weekly-closing copy
// (activity 62, T-5) — same precedent as SiteSettings.consentTextsJson
// (Terms & Conditions, activity 51): stored per clinic, empty/missing falls
// back to the hardcoded default text, never a hard requirement.
//
// Unlike the Terms & Conditions text, every one of these messages has
// dynamic content baked into the sentence (the missing-items list, the
// patient's name) — a flat replacement string wouldn't work. Each template
// type supports exactly the tokens listed below; anything else in the
// clinic's custom text is left as literal text.
export type ReminderTemplateType = "today" | "yesterday" | "onboarding" | "weeklyClosing";
export type ReminderTemplateLang = { en?: string; pt?: string };
export type ReminderTemplatesJson = Partial<Record<ReminderTemplateType, ReminderTemplateLang>>;

export const REMINDER_TEMPLATE_TOKENS: Record<ReminderTemplateType, string[]> = {
  today: ["{items}"],
  yesterday: ["{items}"],
  onboarding: ["{items}"],
  weeklyClosing: ["{name}"],
};

/**
 * O texto na língua do paciente — ou `null`, que é "use o padrão".
 *
 * Existe porque quem enfileira precisa decidir a língua **antes** de gravar:
 * o campo guardado é lido como string, e guardar o par `{ en, pt }` ali
 * quebrava a prévia, a aprovação e o envio de uma vez só (QA de 25/09, R1).
 */
export function pickTemplate(
  tpl: ReminderTemplateLang | null | undefined,
  preferredLocale?: string | null
): string | null {
  if (!tpl) return null;
  const pt = String(preferredLocale || "").toLowerCase().startsWith("pt");
  const escolhido = pt ? tpl.pt || tpl.en : tpl.en || tpl.pt;
  return escolhido?.trim() || null;
}

export async function getReminderTemplates(clinicId: string | null | undefined): Promise<ReminderTemplatesJson> {
  if (!clinicId) return {};
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { reminderTemplatesJson: true } });
  return (clinic?.reminderTemplatesJson as ReminderTemplatesJson) || {};
}

/** `{token}` -> value, everything else in `custom` left untouched. */
export function renderTemplate(custom: string, vars: Record<string, string>): string {
  let out = custom;
  for (const [key, val] of Object.entries(vars)) out = out.split(`{${key}}`).join(val);
  return out;
}
