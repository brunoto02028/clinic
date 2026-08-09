import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateBookToken, logBookEvent, sendBookConfirmationEmail, sendBookChapterDeliveryEmail, BOOK_SOURCE, BOOK_CLUSTER } from "@/lib/book";

export const dynamic = "force-dynamic";

// POST /api/beyond-pain/capture
// body: { email, firstName?, consent }
// GDPR: requires an explicit, unticked consent checkbox on the client.
// Never unlocks the chapter directly — only queues a double opt-in
// confirmation email whose magic link both confirms the address and
// unlocks Chapter One (see app/api/beyond-pain/confirm).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = body.firstName ? String(body.firstName).trim() : null;
    const language = body.language === "pt" ? "pt" : "en";
    const consent = body.consent === true;
    const ref = body.ref ? String(body.ref) : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: "Consent is required to send you the chapter" }, { status: 400 });
    }

    const existing = await (prisma as any).emailContact.findUnique({ where: { email } });
    const token = existing?.confirmToken || generateBookToken();

    const contact = await (prisma as any).emailContact.upsert({
      where: { email },
      create: {
        email,
        firstName,
        language,
        source: BOOK_SOURCE,
        cluster: BOOK_CLUSTER,
        consent: true,
        consentAt: new Date(),
        confirmToken: token,
        subscribed: false, // stays false until they confirm
      },
      update: {
        firstName: firstName || undefined,
        // Always honour their latest language choice — they may resubmit
        // wanting the other edition of the free chapter.
        language,
        // Don't overwrite an existing non-book source/cluster — a patient
        // or newsletter contact who also joins the book list keeps their
        // original attribution; the "captured" event below still tags this.
        consent: true,
        consentAt: existing?.consentAt || new Date(),
        confirmToken: existing?.confirmToken || token,
      },
    });

    await logBookEvent(contact.id, "book_captured");

    // Referral attribution — best-effort, never blocks the capture flow.
    // Only marks conversion; never auto-subscribes anyone (the contact above
    // still went through the exact same consent-gated form as any visitor).
    // Gated on friendEmail matching too — a referral id is visible in the
    // invite link and forwardable, so without this check anyone who obtains
    // a pending referral's id could claim it under a different email.
    if (ref) {
      try {
        await (prisma as any).bookReferral.updateMany({
          where: { id: ref, convertedAt: null, friendEmail: email },
          data: { convertedAt: new Date(), friendContactId: contact.id },
        });
      } catch (err) {
        console.error("[beyond-pain/capture] referral attribution failed:", err);
      }
    }

    // Already confirmed for the book specifically — skip the double opt-in
    // step and unlock immediately via the same cookie the confirm route
    // would set. Gated on source === BOOK_SOURCE (matches the check every
    // other route in this module makes): EmailContact is shared across
    // funnels (newsletter, lead-magnet, intake...), so without this check
    // anyone who knows an email already confirmed *anywhere else* on the
    // site could submit it here and receive that contact's confirmToken
    // cookie in the response — a cross-funnel identity/token leak.
    if (existing?.confirmed && existing.source === BOOK_SOURCE) {
      await logBookEvent(contact.id, "book_unlocked", { skippedConfirm: true });
      await sendBookChapterDeliveryEmail({ email, firstName, language, confirmToken: contact.confirmToken, contactId: contact.id });
      const res = NextResponse.json({ status: "unlocked" });
      res.cookies.set("book_access", contact.confirmToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      return res;
    }

    await sendBookConfirmationEmail({ email, firstName, token: contact.confirmToken });
    return NextResponse.json({ status: "pending_confirmation" });
  } catch (error) {
    console.error("[beyond-pain/capture] error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
