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

    // Already confirmed elsewhere (e.g. existing newsletter subscriber) —
    // skip the double opt-in step and unlock immediately via the same cookie
    // the confirm route would set.
    if (existing?.confirmed) {
      await logBookEvent(contact.id, "book_unlocked", { skippedConfirm: true });
      await sendBookChapterDeliveryEmail({ email, firstName, language });
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
