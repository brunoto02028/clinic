// lib/lead-magnet.ts
// Shared helpers for the article lead-magnet capture flow (P1.2 of
// BPR_Devin_Spec_Website_Improvements.md): cluster matching, confirm
// tokens, and the double opt-in / delivery emails. Extends the existing
// EmailContact model rather than a separate "Lead" table — see
// app/api/lead-magnet/* routes for the actual endpoints.
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { wrapInLayout } from "@/lib/email-templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.rehab";
const BRAND_PRIMARY = "#4F7361";

export function generateConfirmToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

/** Picks the best-matching active guide for a set of article tags, falling
 *  back to any active guide if nothing matches (never show nothing). */
export async function matchGuideForTags(tags: string[]): Promise<{ id: string; slug: string; cluster: string; titleEn: string; titlePt: string } | null> {
  const normalizedTags = (tags || []).map((t) => t.toLowerCase());
  const guides = await (prisma as any).leadMagnetGuide.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, cluster: true, titleEn: true, titlePt: true },
  });
  if (guides.length === 0) return null;

  const match = guides.find((g: any) => normalizedTags.includes(g.cluster.toLowerCase()));
  return match || guides[0];
}

async function logEvent(contactId: string, type: string, meta?: Record<string, unknown>) {
  try {
    await (prisma as any).emailContactEvent.create({ data: { contactId, type, meta: meta || undefined } });
  } catch (err) {
    console.error("[lead-magnet] failed to log event:", type, err);
  }
}
export { logEvent as logLeadMagnetEvent };

/** Attribution: logs a "booked" event on a lead-magnet contact when they go
 *  on to book an appointment (P3 acceptance criterion — "attribution logs a
 *  booked event if a lead later books"). Matches by email; no-op if the
 *  email isn't a known lead-magnet contact, or already has a booked event. */
export async function logBookedEventForEmail(email: string) {
  if (!email) return;
  try {
    const contact = await (prisma as any).emailContact.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, events: { select: { type: true } } },
    });
    if (!contact) return;
    if (contact.events.some((e: any) => e.type === "booked")) return;
    await logEvent(contact.id, "booked");
  } catch (err) {
    console.error("[lead-magnet] failed to log booked event for", email, err);
  }
}

/** Sends the double opt-in confirmation email — the PDF is NOT attached/linked yet. */
export async function sendConfirmationEmail(params: {
  email: string;
  firstName?: string | null;
  locale: "en" | "pt";
  confirmToken: string;
  guideTitle: string;
}) {
  const { email, firstName, locale, confirmToken, guideTitle } = params;
  const isPt = locale === "pt";
  const confirmUrl = `${BASE_URL}/lead-magnet/confirm?token=${confirmToken}`;
  const greeting = firstName ? `${isPt ? "Olá" : "Hi"} ${firstName},` : isPt ? "Olá," : "Hi,";

  const subject = isPt
    ? `Confirme seu e-mail para receber: ${guideTitle}`
    : `Confirm your email to get: ${guideTitle}`;

  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">${isPt ? "Confirme seu e-mail" : "Confirm your email"}</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${
      isPt
        ? `Obrigado pelo interesse no guia <strong>${guideTitle}</strong>. Para proteger sua caixa de entrada, pedimos que confirme seu e-mail antes de enviarmos o PDF.`
        : `Thanks for your interest in <strong>${guideTitle}</strong>. To protect your inbox, we ask you to confirm your email before we send the PDF over.`
    }</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${confirmUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${isPt ? "Confirmar e Receber o Guia →" : "Confirm & Get the Guide →"}</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">${
      isPt
        ? "Se você não pediu este guia, pode ignorar este e-mail com segurança — nada será enviado sem essa confirmação."
        : "If you didn't request this guide, you can safely ignore this email — nothing will be sent without this confirmation."
    }</p>`;

  const html = await wrapInLayout(body, subject, isPt ? "pt-BR" : "en-GB");
  return sendEmail({ to: email, subject, html });
}

/** Sends the guide delivery email (immediate nurture step #1) — link-based,
 *  not a public permanent link: the download route checks `confirmed`. */
export async function sendDeliveryEmail(params: {
  email: string;
  firstName?: string | null;
  locale: "en" | "pt";
  confirmToken: string;
  guideSlug: string;
  guideTitle: string;
}) {
  const { email, firstName, locale, confirmToken, guideSlug, guideTitle } = params;
  const isPt = locale === "pt";
  const downloadUrl = `${BASE_URL}/api/lead-magnet/download?token=${confirmToken}&guide=${guideSlug}`;
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const greeting = firstName ? `${isPt ? "Olá" : "Hi"} ${firstName},` : isPt ? "Olá," : "Hi,";

  const subject = isPt ? `Aqui está o seu guia: ${guideTitle}` : `Here's your guide: ${guideTitle}`;

  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">${isPt ? "Seu guia está pronto 📄" : "Your guide is ready 📄"}</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${greeting} ${
      isPt
        ? `obrigado por confirmar! Aqui está o seu guia <strong>${guideTitle}</strong>.`
        : `thanks for confirming! Here's your copy of <strong>${guideTitle}</strong>.`
    }</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${downloadUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${isPt ? "Baixar o Guia (PDF) →" : "Download the Guide (PDF) →"}</a>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 4px;">${
      isPt
        ? "Nos próximos dias, vamos enviar mais um ou dois e-mails com dicas relacionadas — sem spam, prometido."
        : "Over the next few days we'll send a couple more short, useful emails on this topic — no spam, promise."
    }</p>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">${isPt ? "Cancelar inscrição" : "Unsubscribe"}</a></p>`;

  const html = await wrapInLayout(body, subject, isPt ? "pt-BR" : "en-GB");
  return sendEmail({ to: email, subject, html });
}

// Short, cluster-specific "key evidence-based message" for the +2 day
// nurture email — one genuinely useful idea, not a sales pitch.
const NURTURE_MESSAGE: Record<string, { en: string; pt: string }> = {
  running: {
    en: "The #1 cause of repeat running injuries isn't bad form — it's increasing volume too fast. If you're building back up, the safest ceiling is about 10% more per week than the week before.",
    pt: "A causa nº1 de lesões recorrentes na corrida não é a técnica — é aumentar o volume rápido demais. Se está retomando, o teto mais seguro é cerca de 10% a mais por semana do que na semana anterior.",
  },
  neck: {
    en: "Static posture — even a \"good\" one — held for hours is what actually drives neck pain, not any single position. The fix isn't a perfect setup, it's moving every 30 minutes.",
    pt: "Postura estática — mesmo uma \"boa\" — mantida por horas é o que realmente causa a dor no pescoço, não uma posição específica. A solução não é uma configuração perfeita, é se mover a cada 30 minutos.",
  },
  knee: {
    en: "Imaging findings like mild cartilage wear are extremely common in pain-free knees too. A scan alone rarely tells the whole story — how your knee actually loads and moves matters more.",
    pt: "Achados de imagem como desgaste leve de cartilagem são muito comuns também em joelhos sem dor. Um exame sozinho raramente conta toda a história — como o joelho realmente carrega e se move importa mais.",
  },
  pain: {
    en: "Persistent pain doesn't always mean ongoing damage — the nervous system can stay \"switched on\" even after tissue has healed. That's exactly why a generic rest protocol often doesn't help.",
    pt: "A dor persistente nem sempre significa dano contínuo — o sistema nervoso pode continuar \"ligado\" mesmo depois que o tecido já cicatrizou. É exatamente por isso que um protocolo genérico de repouso muitas vezes não ajuda.",
  },
  tendon: {
    en: "Most persistent tendon pain isn't inflammation — it's a failed adaptation in the tendon structure. That's why rest alone rarely fixes it, and why the right kind of loading does.",
    pt: "A maioria das dores persistentes de tendão não é inflamação — é uma adaptação falhada na estrutura do tendão. É por isso que o repouso sozinho raramente resolve, e a carga certa sim.",
  },
};

/** +2 day nurture email — cluster's key message + link to a related article. */
export async function sendNurture2DayEmail(params: {
  email: string;
  firstName?: string | null;
  locale: "en" | "pt";
  cluster: string;
  articleUrl?: string | null;
  articleTitle?: string | null;
}) {
  const { email, firstName, locale, cluster, articleUrl, articleTitle } = params;
  const isPt = locale === "pt";
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const greeting = firstName ? `${isPt ? "Olá" : "Hi"} ${firstName},` : isPt ? "Olá," : "Hi,";
  const message = NURTURE_MESSAGE[cluster] || NURTURE_MESSAGE.pain;

  const subject = isPt ? "Uma coisa que vale saber" : "One thing worth knowing";

  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">${isPt ? "Uma coisa que vale saber 💡" : "One thing worth knowing 💡"}</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${isPt ? message.pt : message.en}</p>
    ${articleUrl && articleTitle ? `
    <div style="text-align:center;margin:28px 0;">
      <a href="${articleUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${isPt ? "Ler o artigo completo →" : "Read the full article →"}</a>
    </div>` : ""}
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">${isPt ? "Cancelar inscrição" : "Unsubscribe"}</a></p>`;

  const html = await wrapInLayout(body, subject, isPt ? "pt-BR" : "en-GB");
  return sendEmail({ to: email, subject, html });
}

/** +5 day nurture email — soft, no-pressure discovery call offer. */
export async function sendNurture5DayEmail(params: {
  email: string;
  firstName?: string | null;
  locale: "en" | "pt";
}) {
  const { email, firstName, locale } = params;
  const isPt = locale === "pt";
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const bookUrl = `${BASE_URL}/start`;
  const greeting = firstName ? `${isPt ? "Olá" : "Hi"} ${firstName},` : isPt ? "Olá," : "Hi,";

  const subject = isPt ? "Ainda com dúvidas sobre o seu caso?" : "Still unsure about your situation?";

  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">${isPt ? "Sem compromisso, só pra conversar" : "No pressure — just a conversation"}</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${
      isPt
        ? "Esperamos que o material que enviamos tenha ajudado. Se ainda tem dúvidas sobre o seu caso específico, oferecemos uma consulta inicial gratuita — sem compromisso — pra entender o que está acontecendo e se podemos ajudar."
        : "Hope the material we've sent has been useful. If you're still unsure about your specific situation, we offer a free, no-obligation first consultation to understand what's going on and whether we can help."
    }</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${bookUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${isPt ? "Agendar Consulta Gratuita →" : "Book a Free Consultation →"}</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">${
      isPt
        ? "Sem pressão — se preferir só continuar recebendo conteúdo, sem problema nenhum."
        : "No pressure at all — happy to just keep sending useful content if that's what you prefer."
    }</p>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">${isPt ? "Cancelar inscrição" : "Unsubscribe"}</a></p>`;

  const html = await wrapInLayout(body, subject, isPt ? "pt-BR" : "en-GB");
  return sendEmail({ to: email, subject, html });
}
