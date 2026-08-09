// lib/book.ts
// Shared helpers for the "Beyond Pain" book launch module (see
// book/BPR_Devin_Spec_Beyond_Pain_Book.md). Reuses the existing
// EmailContact/EmailContactEvent lead-magnet infrastructure (source =
// "book", cluster = "book") rather than a separate list — see
// app/api/beyond-pain/* routes for the actual endpoints.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { wrapInLayout } from "@/lib/email-templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.rehab";
const BRAND_PRIMARY = "#4F7361";

export const BOOK_ACCESS_COOKIE = "book_access";
export const BOOK_SOURCE = "book";
export const BOOK_CLUSTER = "book";

export function generateBookToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

// firstName comes straight from an unauthenticated public form and the
// target email doesn't have to belong to whoever submitted it (that's how
// double opt-in works) — escape it before interpolating into email HTML so
// it can't be used to inject arbitrary markup/scripts into mail sent to a
// third party's inbox under the clinic's sending domain.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function logEvent(contactId: string, type: string, meta?: Record<string, unknown>) {
  try {
    await (prisma as any).emailContactEvent.create({ data: { contactId, type, meta: meta || undefined } });
  } catch (err) {
    console.error("[book] failed to log event:", type, err);
  }
}
export { logEvent as logBookEvent };

/** Singleton BookConfig row — created with defaults on first read so the
 *  admin page and public page never have to handle "no row yet". */
export async function getBookConfig() {
  const existing = await (prisma as any).bookConfig.findFirst();
  if (existing) return existing;
  return (prisma as any).bookConfig.create({ data: {} });
}

/** All published chapters, in reading order — powers the /beyond-pain/chapters
 *  table of contents. As chapters are written (seeded or added via admin),
 *  they simply appear here; no code change needed. */
export async function getPublishedChapters() {
  return (prisma as any).bookChapter.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: { slug: true, order: true, isFree: true, titleEn: true, contentEn: true, titlePt: true, contentPt: true },
  });
}

/** Plain-text teaser from a chapter's rendered HTML — strips tags and
 *  truncates at a word boundary near `maxLen` characters. */
export function chapterTeaser(html: string, maxLen = 160): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

/** Resolves a confirmed book reader from the `book_access` cookie value
 *  (which stores their EmailContact.confirmToken). Returns null if the
 *  cookie is missing/invalid/unconfirmed — callers must treat that as
 *  "show the capture form, not the content". */
export async function getBookReaderFromToken(token: string | undefined | null) {
  if (!token) return null;
  const contact = await (prisma as any).emailContact.findUnique({ where: { confirmToken: token } });
  if (!contact || !contact.confirmed || contact.source !== BOOK_SOURCE) return null;
  return contact;
}

/** Resolves the first name of a contact referring a friend, from the
 *  `?refFrom={contactId}` query param used on /beyond-pain and
 *  /beyond-pain/chapter-one. Returns null (never throws) for a missing or
 *  unknown id — callers must treat that as "anonymous referrer". */
export async function resolveReferrerContact(refFrom: string | undefined | null) {
  if (!refFrom) return null;
  return (prisma as any).emailContact
    .findUnique({ where: { id: refFrom }, select: { firstName: true } })
    .catch(() => null);
}

/** Double opt-in confirmation email — a magic link that both verifies the
 *  address AND unlocks the chapter (GET /api/beyond-pain/confirm), unlike
 *  the guide flow which just triggers a follow-up delivery email. */
export async function sendBookConfirmationEmail(params: {
  email: string;
  firstName?: string | null;
  token: string;
}) {
  const { email, firstName, token } = params;
  const confirmUrl = `${BASE_URL}/api/beyond-pain/confirm?token=${token}`;
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";

  const subject = "Confirm your email to read Chapter One of Beyond Pain";
  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">Confirm your email</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Thanks for your interest in <strong>Beyond Pain</strong>. Click below to confirm your email — you'll be taken straight to Chapter One.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${confirmUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Confirm &amp; Read Chapter One →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">If you didn't request this, you can safely ignore this email.</p>`;

  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: email, subject, html });
}

/** Delivers the actual free chapter (PDF, in the reader's chosen language)
 *  right after their email is confirmed — the confirmation email only asks
 *  them to click a link; this is the "here it is" email, with the
 *  copyright / no-resale notice and the case for buying the finished book. */
export async function sendBookChapterDeliveryEmail(params: {
  email: string;
  firstName?: string | null;
  language?: string | null;
  confirmToken?: string | null;
  contactId?: string | null;
}) {
  const { email, firstName, confirmToken, contactId } = params;
  const isPt = params.language === "pt";
  const pdfFilename = `chapter-one-${isPt ? "pt" : "en"}.pdf`;
  // Single-use, tokenised download link (see app/api/beyond-pain/download) —
  // not a static /public URL, so it can't just be forwarded/leaked and
  // re-downloaded indefinitely; it stops working after the first download.
  const pdfUrl = confirmToken
    ? `${BASE_URL}/api/beyond-pain/download?token=${confirmToken}&lang=${isPt ? "pt" : "en"}`
    : `${BASE_URL}/beyond-pain/chapter-one`;
  const chapterUrl = `${BASE_URL}/beyond-pain/chapter-one`;
  const bookUrl = `${BASE_URL}/beyond-pain`;
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  // Attach the actual PDF (not just a link) — best-effort: if the file is
  // missing for any reason, we still send the email with the download link.
  let attachments: { filename: string; content: Buffer }[] | undefined;
  try {
    const pdfPath = path.join(process.cwd(), "book", "pdf", pdfFilename);
    attachments = [{ filename: pdfFilename, content: fs.readFileSync(pdfPath) }];
  } catch (err) {
    console.error("[book] Could not read Chapter One PDF for attachment:", err);
  }

  if (isPt) {
    const greeting = firstName ? `Olá ${escapeHtml(firstName)},` : "Olá,";
    const subject = "O seu Capítulo Um chegou — Além da Dor";
    const body = `
      <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">O seu Capítulo Um está pronto</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Obrigado pelo seu interesse em <strong>Além da Dor</strong>. O seu exemplar do primeiro capítulo está pronto para descarregar abaixo.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${pdfUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Descarregar o Capítulo Um (PDF) →</a>
      </div>
      <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 24px;text-align:center;">Prefere ler diretamente na página? <a href="${chapterUrl}" style="color:${BRAND_PRIMARY};">Continue a leitura online</a>.</p>
      <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
      <h3 style="color:#20242D;font-size:15px;margin:0 0 10px;">Um aviso rápido antes de começar</h3>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">Este capítulo é protegido por direitos de autor — um excerto do livro <em>Além da Dor</em>, partilhado consigo apenas para leitura pessoal. Pedimos que não o copie, revenda ou redistribua, mesmo que seja apenas um capítulo. Foram anos de estudo, prática clínica e recuperação pessoal para o escrever, e os direitos de autor protegem esse trabalho.</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Se conhece alguém que também gostaria de o ler, a forma mais generosa de ajudar é enviá-lo a <a href="${bookUrl}" style="color:${BRAND_PRIMARY};">bpr.rehab/beyond-pain</a> para que receba o seu próprio exemplar gratuito — e não um PDF reencaminhado.</p>
      <h3 style="color:#20242D;font-size:15px;margin:0 0 10px;">Porque é que vai importar quando comprar o livro</h3>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">Quando <em>Além da Dor</em> for lançado e decidir comprar um exemplar, estará a fazer muito mais do que adquirir um livro. Estará a ajudar a financiar o estudo e a investigação por trás de cada capítulo, a permitir que eu continue disponível para os pacientes que precisam de cuidado presencial, e a levar esta mensagem — de que a cura é possível para o corpo, a alma e o espírito — a mais pessoas que precisam de a ouvir.</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Obrigado por ser um dos primeiros a lê-lo.</p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Bruno</p>
      ${contactId ? buildReferBlock(contactId, "pt") : ""}
      <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">Cancelar subscrição</a></p>`;
    const html = await wrapInLayout(body, subject, "pt-PT");
    return sendEmail({ to: email, subject, html, attachments });
  }

  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const subject = "Here's your copy of Chapter One — Beyond Pain";
  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">Chapter One is ready</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">Thank you for your interest in <strong>Beyond Pain</strong>. Your copy of the first chapter is ready to download below.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${pdfUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Download Chapter One (PDF) →</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 24px;text-align:center;">Prefer to read it straight on the page? <a href="${chapterUrl}" style="color:${BRAND_PRIMARY};">Continue reading online</a>.</p>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <h3 style="color:#20242D;font-size:15px;margin:0 0 10px;">A quick note before you dive in</h3>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">This chapter is copyright-protected — an excerpt from the forthcoming book <em>Beyond Pain</em>, shared with you for personal reading only. Please don't copy, resell or redistribute it, even as a single chapter. It took years of study, clinical practice and personal recovery to write, and copyright protects that work.</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">If you know someone else who'd enjoy it, the kindest thing you can do is send them to <a href="${bookUrl}" style="color:${BRAND_PRIMARY};">bpr.rehab/beyond-pain</a> so they can get their own free copy — not a forwarded PDF.</p>
    <h3 style="color:#20242D;font-size:15px;margin:0 0 10px;">Why it will matter when you buy the book</h3>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">When <em>Beyond Pain</em> launches and you choose to buy a copy, you're doing far more than owning a book. You're helping fund the research and study behind every chapter, keeping me available for the patients who need hands-on care, and helping this message — that healing is possible for the body, the soul and the spirit — reach more people who need to hear it.</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 8px;">Thank you for being one of the first to read it.</p>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Bruno</p>
    ${contactId ? buildReferBlock(contactId, "en") : ""}
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a></p>`;
  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: email, subject, html, attachments });
}

/** One-off "a friend recommended this" invite — never auto-subscribes the
 *  recipient. They land on /beyond-pain?ref={referralId} and go through the
 *  exact same consent-gated capture form as any other visitor; the ref id
 *  only gets used server-side to mark the referral as converted if/when they
 *  do sign up (see app/api/beyond-pain/capture — attribution, not auto-opt-in). */
export async function sendBookReferralEmail(params: {
  friendEmail: string;
  friendName?: string | null;
  referrerName?: string | null;
  locale?: string | null;
  referralId: string;
}) {
  const { friendEmail, friendName, referrerName, referralId } = params;
  const isPt = params.locale === "pt";
  const referUrl = `${BASE_URL}/beyond-pain?ref=${referralId}`;

  if (isPt) {
    const greeting = friendName ? `Olá ${escapeHtml(friendName)},` : "Olá,";
    const fromLine = referrerName
      ? `<strong>${escapeHtml(referrerName)}</strong> achou que você ia gostar deste livro.`
      : "Um amigo achou que você ia gostar deste livro.";
    const subject = referrerName ? `${referrerName} indicou um livro pra você` : "Alguém indicou um livro pra você";
    const body = `
      <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">Uma indicação especial pra você</h2>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${fromLine} <strong>Além da Dor</strong> é um guia sobre recuperação física, alma e espírito — o primeiro capítulo é gratuito.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${referUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Ler o Capítulo 1 Grátis →</a>
      </div>
      <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
      <p style="color:#9ca3af;font-size:11px;line-height:1.6;margin:0;text-align:center;">Você recebeu este e-mail avulso porque alguém usou nossa ferramenta de indicação para compartilhar este livro com você. Não vamos enviar mais nada, a menos que você se inscreva.</p>`;
    const html = await wrapInLayout(body, subject, "pt-PT");
    return sendEmail({ to: friendEmail, subject, html });
  }

  const greeting = friendName ? `Hi ${escapeHtml(friendName)},` : "Hi,";
  const fromLine = referrerName
    ? `<strong>${escapeHtml(referrerName)}</strong> thought you'd enjoy this book.`
    : "A friend thought you'd enjoy this book.";
  const subject = referrerName ? `${referrerName} sent you a free book` : "Someone sent you a free book";
  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">Someone thought of you</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${fromLine} <strong>Beyond Pain</strong> is a guide to healing — body, soul and spirit — and the first chapter is free.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${referUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Read Chapter One Free →</a>
    </div>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;line-height:1.6;margin:0;text-align:center;">You're receiving this one-off email because someone used our referral tool to share this book with you. We won't send anything further unless you choose to sign up.</p>`;
  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: friendEmail, subject, html });
}

/** Small, discreet CTA line for marketing emails (article newsletter, book
 *  nurture/delivery, campaigns) linking to the refer-a-friend form,
 *  pre-identifying the recipient as the referrer via ?refFrom=. Deliberately
 *  NOT wired into wrapInLayout() itself — that's shared by transactional
 *  emails (password reset etc.) where this would make no sense; callers
 *  that want it insert this block into their own template content. */
export function buildReferBlock(contactId: string, locale?: string | null): string {
  const isPt = locale === "pt";
  const referUrl = `${BASE_URL}/beyond-pain?refFrom=${contactId}`;
  const text = isPt
    ? `📖 Conhece alguém que ia gostar de um capítulo grátis do livro <em>Além da Dor</em>?`
    : `📖 Know someone who'd love a free chapter of <em>Beyond Pain</em>?`;
  const cta = isPt ? "Indicar um amigo →" : "Refer a friend →";
  return `<p style="text-align:center;font-size:12px;color:#6b7280;margin:20px 0 0;">${text}<br/><a href="${referUrl}" style="color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;">${cta}</a></p>`;
}

export async function sendBookNurture3DayEmail(params: { email: string; firstName?: string | null; contactId?: string | null }) {
  const { email, firstName, contactId } = params;
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const chapterUrl = `${BASE_URL}/beyond-pain/chapter-one`;
  const subject = "Behind the scenes of Beyond Pain";
  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">A quick behind-the-scenes note</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">One of the strangest findings while researching this book: a Scottish woman named Jo Cameron feels almost no pain at all — the result of a rare genetic mutation. It sounds like a gift. It isn't. Chapter One explains why pain, for all its misery, is something you'd genuinely miss.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">If you haven't finished it yet, it's waiting for you.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${chapterUrl}" style="display:inline-block;background-color:${BRAND_PRIMARY};color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Continue reading →</a>
    </div>
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Reply to this email any time — I read every one, and I'd love to hear your own story with pain.</p>
    ${contactId ? buildReferBlock(contactId, "en") : ""}`;

  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: email, subject, html });
}

export async function sendBookNurture7DayEmail(params: { email: string; firstName?: string | null; contactId?: string | null }) {
  const { email, firstName, contactId } = params;
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Hi,";
  const subject = "Body, soul and spirit — the idea behind Beyond Pain";
  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">The idea underneath it all</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Pain is rarely only physical. It speaks the language of the body, the soul and the spirit — and lasting healing has to meet all three. That's the thread running through every chapter of <strong>Beyond Pain</strong>, grounded in the science of how pain works and a faith that takes the whole person seriously.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">I'll send occasional updates as new chapters are written — and you'll be first to know when the book launches, with an early-reader price.</p>
    ${contactId ? buildReferBlock(contactId, "en") : ""}
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a></p>`;

  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: email, subject, html });
}
