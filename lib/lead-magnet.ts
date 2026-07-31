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
