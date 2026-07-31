import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logLeadMagnetEvent, sendDeliveryEmail } from "@/lib/lead-magnet";

export const dynamic = "force-dynamic";

// POST /api/lead-magnet/confirm  { token }
// Double opt-in confirmation — marks the contact confirmed+subscribed and
// triggers the immediate guide-delivery email (nurture step #1). Idempotent:
// re-confirming an already-confirmed contact just re-sends the guide email.
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const contact = await (prisma as any).emailContact.findUnique({ where: { confirmToken: token } });
    if (!contact) {
      return NextResponse.json({ error: "Invalid or expired confirmation link" }, { status: 404 });
    }

    if (!contact.confirmed) {
      await (prisma as any).emailContact.update({
        where: { id: contact.id },
        data: { confirmed: true, confirmedAt: new Date(), subscribed: true },
      });
      await logLeadMagnetEvent(contact.id, "confirmed");
    }

    const guide = contact.cluster
      ? await (prisma as any).leadMagnetGuide.findFirst({ where: { cluster: contact.cluster, isActive: true } })
      : await (prisma as any).leadMagnetGuide.findFirst({ where: { isActive: true } });

    if (guide) {
      const isPt = (contact.language || "en") === "pt";
      await sendDeliveryEmail({
        email: contact.email,
        firstName: contact.firstName,
        locale: isPt ? "pt" : "en",
        confirmToken: contact.confirmToken,
        guideSlug: guide.slug,
        guideTitle: isPt ? guide.titlePt : guide.titleEn,
      });
    }

    return NextResponse.json({ status: "confirmed" });
  } catch (error) {
    console.error("[lead-magnet/confirm] error:", error);
    return NextResponse.json({ error: "Failed to confirm" }, { status: 500 });
  }
}
