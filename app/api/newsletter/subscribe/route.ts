export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logLeadMagnetEvent } from "@/lib/lead-magnet";

// POST /api/newsletter/subscribe — footer newsletter signup (P4 of
// BPR_Devin_Spec_Website_Improvements.md). Feeds the same EmailContact list
// used by the lead-magnet funnel and article newsletter, so admins see it
// all in one place. Requires explicit, unticked GDPR consent (reuses the
// existing consent framework — see lib/lead-magnet.ts / EmailContact model).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const consent = body?.consent === true;
    const locale: "en" | "pt" = body?.locale === "pt" ? "pt" : "en";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: "Consent is required to subscribe" }, { status: 400 });
    }

    const existing = await (prisma as any).emailContact.findUnique({ where: { email } });

    if (existing) {
      const contact = await (prisma as any).emailContact.update({
        where: { email },
        data: {
          subscribed: true,
          unsubscribedAt: null,
          consent: true,
          consentAt: existing.consentAt || new Date(),
          confirmed: true,
          confirmedAt: existing.confirmedAt || new Date(),
          language: existing.language || locale,
          source: existing.source || "newsletter_footer",
        },
      });
      await logLeadMagnetEvent(contact.id, "captured", { source: "newsletter_footer" });
      return NextResponse.json({ success: true });
    }

    const contact = await (prisma as any).emailContact.create({
      data: {
        email,
        language: locale,
        source: "newsletter_footer",
        consent: true,
        consentAt: new Date(),
        confirmed: true,
        confirmedAt: new Date(),
        subscribed: true,
      },
    });
    await logLeadMagnetEvent(contact.id, "captured", { source: "newsletter_footer" });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[newsletter-subscribe] error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
