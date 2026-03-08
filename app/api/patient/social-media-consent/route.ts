import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

// GET - Check if patient has given social media consent
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = effectiveUser;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { socialMediaConsentAt: true },
    });

    return NextResponse.json({
      consented: !!user?.socialMediaConsentAt,
      consentedAt: user?.socialMediaConsentAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check consent" }, { status: 500 });
  }
}

// POST - Grant or revoke social media image consent
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId, isImpersonating } = effectiveUser;
    if (isImpersonating) return NextResponse.json({ error: "Cannot modify consent while impersonating" }, { status: 403 });

    const body = await req.json();
    const action = body.action; // "grant" or "revoke"

    if (action === "grant") {
      await prisma.user.update({
        where: { id: userId },
        data: { socialMediaConsentAt: new Date() },
      });

      await (prisma as any).consentLog.create({
        data: {
          patientId: userId,
          action: "SOCIAL_MEDIA_IMAGE_CONSENT",
          termsVersion: "1.0",
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
          metadata: { source: "body-assessment-page", timestamp: new Date().toISOString() },
        },
      });

      return NextResponse.json({ success: true, consented: true, consentedAt: new Date() });
    } else if (action === "revoke") {
      await prisma.user.update({
        where: { id: userId },
        data: { socialMediaConsentAt: null },
      });

      await (prisma as any).consentLog.create({
        data: {
          patientId: userId,
          action: "SOCIAL_MEDIA_IMAGE_REVOKE",
          termsVersion: "1.0",
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent") || "unknown",
          metadata: { source: "body-assessment-page", timestamp: new Date().toISOString() },
        },
      });

      return NextResponse.json({ success: true, consented: false });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Social media consent error:", error);
    return NextResponse.json({ error: "Failed to update consent" }, { status: 500 });
  }
}
