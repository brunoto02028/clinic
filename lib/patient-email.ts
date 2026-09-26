// "Email to patient" composer (activity 68): validation, the exact e-mail that is
// previewed and sent, and the appointment-confirmation templates.
//
// The e-mail is rendered by ONE function (renderPatientEmail) used by both the
// preview and the send route, and the send route only proceeds when the hash of
// what it renders equals the hash the staff member previewed — so what leaves is
// what was seen.

import { createHash } from "crypto";
import { wrapInLayout } from "@/lib/email-templates";

export const LANGUAGES = ["en", "pt", "both"] as const;
export type EmailLanguage = (typeof LANGUAGES)[number];

export type EmailInput = {
  language: EmailLanguage;
  subjectEn: string;
  subjectPt: string;
  bodyEn: string;
  bodyPt: string;
  appointmentId?: string | null;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  bodyText: string;
  locale: "pt-BR" | "en-GB";
  bothLanguages: boolean;
  hash: string;
};

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function parseEmailInput(body: any): { ok: true; data: EmailInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  if (!LANGUAGES.includes(body.language)) return { ok: false, error: "language must be en, pt or both" };
  const data: EmailInput = {
    language: body.language,
    subjectEn: str(body.subjectEn),
    subjectPt: str(body.subjectPt),
    bodyEn: str(body.bodyEn),
    bodyPt: str(body.bodyPt),
    appointmentId: typeof body.appointmentId === "string" && body.appointmentId ? body.appointmentId : null,
  };
  const wanted = data.language === "both" ? (["en", "pt"] as const) : ([data.language] as const);
  for (const l of wanted) {
    const subject = l === "en" ? data.subjectEn : data.subjectPt;
    const text = l === "en" ? data.bodyEn : data.bodyPt;
    const label = l === "en" ? "English" : "Portuguese";
    if (!subject) return { ok: false, error: `${label} subject is required` };
    if (!text) return { ok: false, error: `${label} message is required` };
    // No raw newlines in the subject — a `\r`/`\n` here would sit next to any
    // header-splitting bug a future SMTP change might introduce; the provider
    // API today takes `subject` as a structured field, but there is no reason
    // to accept it anyway.
    if (/[\r\n]/.test(subject)) return { ok: false, error: `${label} subject cannot contain line breaks` };
    if (subject.length > MAX_SUBJECT) return { ok: false, error: `${label} subject must be at most ${MAX_SUBJECT} characters` };
    if (text.length > MAX_BODY) return { ok: false, error: `${label} message must be at most ${MAX_BODY} characters` };
  }
  return { ok: true, data };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Plain text only: blank line = new paragraph, single newline = line break.
function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${escapeHtml(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

/**
 * Renders the e-mail exactly as it will be sent. "both" puts the patient's own
 * language first and the other below a rule.
 */
export async function renderPatientEmail(
  patient: { preferredLocale?: string | null; clinicId?: string | null },
  input: EmailInput
): Promise<RenderedEmail> {
  const patientIsPt = String(patient.preferredLocale || "en-GB").toLowerCase().startsWith("pt");
  const order: ("en" | "pt")[] = input.language === "both" ? (patientIsPt ? ["pt", "en"] : ["en", "pt"]) : [input.language];
  const pick = (l: "en" | "pt") => ({
    subject: l === "en" ? input.subjectEn : input.subjectPt,
    text: l === "en" ? input.bodyEn : input.bodyPt,
  });
  const parts = order.map(pick);
  const locale: RenderedEmail["locale"] = order[0] === "pt" ? "pt-BR" : "en-GB";

  const subject = parts.map((p) => p.subject).join(" / ");
  const bodyText = parts.map((p) => p.text).join("\n\n———\n\n");
  const content = parts
    .map((p) => textToHtml(p.text))
    .join('<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">');
  const html = await wrapInLayout(content, escapeHtml(parts[0].text.slice(0, 100)), locale, patient.clinicId);

  const hash = createHash("sha256")
    .update(JSON.stringify({ subject, bodyText, locale, both: input.language === "both" }))
    .digest("hex");
  return { subject, html, bodyText, locale, bothLanguages: input.language === "both", hash };
}

// ─── Appointment confirmation templates (T-3) ───

type TemplateAppointment = { dateTime: Date; duration: number; treatmentType: string; price: number };

const fmtDate = (d: Date, loc: string) =>
  new Intl.DateTimeFormat(loc, { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
const fmtTime = (d: Date, loc: string) =>
  new Intl.DateTimeFormat(loc, { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

/** True when the appointment reads as a home visit (treatment type or notes). */
export function looksLikeHomeVisit(a: { treatmentType?: string | null; notes?: string | null }): boolean {
  return /home|domic/i.test(`${a.treatmentType || ""} ${a.notes || ""}`);
}

/**
 * Prefilled EN/PT text for a confirmation. Date and time are formatted in
 * Europe/London whatever the server's own timezone is. Wording uses
 * "therapist"/"terapeuta" (never "terapeuta").
 */
export function confirmationTemplate(opts: {
  kind: "home" | "clinic";
  patientFirstName: string;
  therapistFirstName: string;
  appointment: TemplateAppointment;
  address?: string | null;
}): Pick<EmailInput, "subjectEn" | "subjectPt" | "bodyEn" | "bodyPt"> {
  const { kind, patientFirstName: name, therapistFirstName: therapist, appointment: a, address } = opts;
  const start = a.dateTime;
  const end = new Date(start.getTime() + a.duration * 60 * 1000);
  const dEn = fmtDate(start, "en-GB");
  const dPt = fmtDate(start, "pt-BR");
  const tStart = fmtTime(start, "en-GB");
  const tEnd = fmtTime(end, "en-GB");
  const price = a.price > 0 ? a.price : null;

  if (kind === "home") {
    const addrEn = address ? `\nAddress: ${address}` : "";
    const addrPt = address ? `\nEndereço: ${address}` : "";
    const priceEn = price ? `\nFee: £${price.toFixed(2)}, payable at the visit.` : "";
    const pricePt = price ? `\nValor: £${price.toFixed(2)}, a pagar na visita.` : "";
    return {
      subjectEn: `Your home visit — ${dEn}, ${tStart}`,
      subjectPt: `Sua visita domiciliar — ${dPt}, ${tStart}`,
      bodyEn: `Hi ${name},\n\nThis is to confirm your home visit with ${therapist}:\n\n${dEn}\n${tStart}–${tEnd} (UK time)${addrEn}${priceEn}\n\nIf anything comes up, just let me know.\n\nSee you soon!\n${therapist}`,
      bodyPt: `Olá ${name},\n\nConfirmando a sua visita domiciliar com ${therapist}:\n\n${dPt}\n${tStart}–${tEnd} (horário do Reino Unido)${addrPt}${pricePt}\n\nSe surgir qualquer imprevisto, é só me avisar.\n\nAté breve!\n${therapist}`,
    };
  }
  const priceEn = price ? `\nFee: £${price.toFixed(2)}.` : "";
  const pricePt = price ? `\nValor: £${price.toFixed(2)}.` : "";
  return {
    subjectEn: `Your appointment — ${dEn}, ${tStart}`,
    subjectPt: `Sua consulta — ${dPt}, ${tStart}`,
    bodyEn: `Hi ${name},\n\nThis is to confirm your appointment with ${therapist}:\n\n${dEn}\n${tStart}–${tEnd} (UK time)${priceEn}\n\nIf you need to change it, just let me know.\n\nSee you soon!\n${therapist}`,
    bodyPt: `Olá ${name},\n\nConfirmando a sua consulta com ${therapist}:\n\n${dPt}\n${tStart}–${tEnd} (horário do Reino Unido)${pricePt}\n\nSe precisar alterar, é só me avisar.\n\nAté breve!\n${therapist}`,
  };
}
