import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateConfirmToken, matchGuideForTags, logLeadMagnetEvent, sendConfirmationEmail, sendDeliveryEmail } from "@/lib/lead-magnet";

export const dynamic = "force-dynamic";

// POST /api/lead-magnet/capture
// body: { email, firstName?, locale, tags, articleSlug? }
// GDPR: requires an explicit, unticked consent checkbox on the client —
// this route rejects the request if consent !== true.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = body.firstName ? String(body.firstName).trim() : null;
    const locale: "en" | "pt" = body.locale === "pt" ? "pt" : "en";
    const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
    const consent = body.consent === true;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: "Consent is required to send you the guide" }, { status: 400 });
    }

    const guide = await matchGuideForTags(tags);
    if (!guide) {
      return NextResponse.json({ error: "No guide available" }, { status: 503 });
    }
    const guideTitle = locale === "pt" ? guide.titlePt : guide.titleEn;

    const existing = await (prisma as any).emailContact.findUnique({ where: { email } });

    // Already confirmed for a lead-magnet guide specifically — skip the
    // double opt-in step and deliver immediately. Gated on source starting
    // with "guide-" (how this route tags its own contacts): EmailContact is
    // shared across funnels (newsletter, book, intake...), so without this
    // check anyone who knows an email already confirmed *anywhere else* on
    // the site could submit it here and trigger an unsolicited guide-delivery
    // email to that address, plus use the delivered/pending_confirmation
    // response as an oracle for whether that email is a confirmed contact
    // (same class of issue fixed in app/api/beyond-pain/capture/route.ts).
    if (existing?.confirmed && existing.source?.startsWith("guide-")) {
      const confirmToken = existing.confirmToken || generateConfirmToken();
      await (prisma as any).emailContact.update({
        where: { id: existing.id },
        data: {
          cluster: guide.cluster,
          consent: true,
          consentAt: existing.consentAt || new Date(),
          confirmToken,
          language: locale,
          ...(firstName && !existing.firstName ? { firstName } : {}),
        },
      });
      await logLeadMagnetEvent(existing.id, "captured", { guideSlug: guide.slug, articleSlug: body.articleSlug, alreadyConfirmed: true });
      await sendDeliveryEmail({ email, firstName: firstName || existing.firstName, locale, confirmToken, guideSlug: guide.slug, guideTitle });
      return NextResponse.json({ status: "delivered" });
    }

    const confirmToken = existing?.confirmToken || generateConfirmToken();
    const contact = await (prisma as any).emailContact.upsert({
      where: { email },
      create: {
        email,
        firstName,
        language: locale,
        source: `guide-${guide.slug}`,
        cluster: guide.cluster,
        consent: true,
        consentAt: new Date(),
        confirmToken,
        subscribed: false, // stays false until they confirm — keeps existing newsletter sends double-opt-in-safe
      },
      update: {
        firstName: firstName || undefined,
        language: locale,
        cluster: guide.cluster,
        consent: true,
        consentAt: new Date(),
        confirmToken,
      },
    });

    await logLeadMagnetEvent(contact.id, "captured", { guideSlug: guide.slug, articleSlug: body.articleSlug });
    await sendConfirmationEmail({ email, firstName, locale, confirmToken, guideTitle });

    return NextResponse.json({ status: "pending_confirmation" });
  } catch (error) {
    console.error("[lead-magnet/capture] error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
