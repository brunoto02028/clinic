// lib/book.ts
// Shared helpers for the "Beyond Pain" book launch module (see
// book/BPR_Devin_Spec_Beyond_Pain_Book.md). Reuses the existing
// EmailContact/EmailContactEvent lead-magnet infrastructure (source =
// "book", cluster = "book") rather than a separate list — see
// app/api/beyond-pain/* routes for the actual endpoints.
import crypto from "crypto";
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
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

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

export async function sendBookNurture3DayEmail(params: { email: string; firstName?: string | null }) {
  const { email, firstName } = params;
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
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
    <p style="color:#374151;font-size:14px;line-height:1.7;margin:0;">Reply to this email any time — I read every one, and I'd love to hear your own story with pain.</p>`;

  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: email, subject, html });
}

export async function sendBookNurture7DayEmail(params: { email: string; firstName?: string | null }) {
  const { email, firstName } = params;
  const unsubscribeUrl = `${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const subject = "Body, soul and spirit — the idea behind Beyond Pain";
  const body = `
    <h2 style="color:#20242D;font-size:20px;margin:0 0 16px;">The idea underneath it all</h2>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">${greeting}</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px;">Pain is rarely only physical. It speaks the language of the body, the soul and the spirit — and lasting healing has to meet all three. That's the thread running through every chapter of <strong>Beyond Pain</strong>, grounded in the science of how pain works and a faith that takes the whole person seriously.</p>
    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">I'll send occasional updates as new chapters are written — and you'll be first to know when the book launches, with an early-reader price.</p>
    <hr style="border:none;border-top:1px solid #E4E3DF;margin:24px 0;" />
    <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;">Unsubscribe</a></p>`;

  const html = await wrapInLayout(body, subject, "en-GB");
  return sendEmail({ to: email, subject, html });
}
