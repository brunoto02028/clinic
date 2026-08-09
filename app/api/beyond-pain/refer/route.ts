import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendBookReferralEmail } from "@/lib/book";

export const dynamic = "force-dynamic";

const MAX_REFERRALS_PER_24H = 10;

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

// POST /api/beyond-pain/refer
// body: { friendEmail, friendName?, referrerContactId?, referrerName?, locale?, website }
// One-off invite only — never subscribes the friend. `website` is a hidden
// honeypot field: real visitors never fill it, so a non-empty value is
// treated as a bot and answered with a fake success (no tell-tale error).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const friendEmail = String(body.friendEmail || "").trim().toLowerCase();
    const friendName = body.friendName ? String(body.friendName).trim().slice(0, 100) : null;
    const referrerContactId = body.referrerContactId ? String(body.referrerContactId) : null;
    const requestedReferrerName = body.referrerName ? String(body.referrerName).trim().slice(0, 100) : null;
    const locale = body.locale === "pt" ? "pt" : "en";
    const website = body.website;

    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!friendEmail || !friendEmail.includes("@")) {
      return NextResponse.json({ error: "A valid friend email is required" }, { status: 400 });
    }

    // Only trust referrerContactId once it's confirmed to resolve to a real
    // EmailContact — an unverified client-supplied id must never count as
    // "known referrer" for the self-referral check or the rate limit below,
    // otherwise sending a fresh random string on every request would bypass
    // both (the count query would always target a never-before-seen id, and
    // ipHash — the actual fallback signal — would never even be recorded).
    let referrerContact: { email: string; firstName: string | null } | null = null;
    if (referrerContactId) {
      referrerContact = await (prisma as any).emailContact.findUnique({
        where: { id: referrerContactId },
        select: { email: true, firstName: true },
      });
    }
    const verifiedReferrerContactId = referrerContact ? referrerContactId : null;

    if (referrerContact && referrerContact.email.toLowerCase() === friendEmail) {
      return NextResponse.json({ error: "You can't refer yourself" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const ipHash = hashIp(ip);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await (prisma as any).bookReferral.count({
      where: verifiedReferrerContactId
        ? { sentAt: { gte: since }, referrerContactId: verifiedReferrerContactId }
        : { sentAt: { gte: since }, ipHash },
    });
    if (recentCount >= MAX_REFERRALS_PER_24H) {
      return NextResponse.json({ error: "Too many referrals sent recently. Please try again later." }, { status: 429 });
    }

    const referrerName = referrerContact?.firstName || requestedReferrerName || null;

    const referral = await (prisma as any).bookReferral.create({
      data: {
        referrerContactId: verifiedReferrerContactId,
        referrerName,
        friendEmail,
        friendName,
        locale,
        ipHash: verifiedReferrerContactId ? null : ipHash,
      },
    });

    await sendBookReferralEmail({
      friendEmail,
      friendName,
      referrerName,
      locale,
      referralId: referral.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[beyond-pain/refer] error:", error);
    return NextResponse.json({ error: "Failed to send referral" }, { status: 500 });
  }
}
