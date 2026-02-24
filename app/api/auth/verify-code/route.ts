export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code } = body ?? {};

    if (!userId || !code) {
      return NextResponse.json(
        { error: "userId and code are required" },
        { status: 400 }
      );
    }

    // Find the latest non-expired, non-verified code for this user
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: "No valid verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check max attempts (5)
    if (verificationCode.attempts >= 5) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 429 }
      );
    }

    // Increment attempts
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { attempts: { increment: 1 } },
    });

    // Check code match
    if (verificationCode.code !== code.trim()) {
      const remaining = 4 - verificationCode.attempts; // already incremented
      return NextResponse.json(
        {
          error: remaining > 0
            ? `Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`
            : "Too many failed attempts. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Code is correct — activate user
    await prisma.$transaction([
      // Mark code as verified
      prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { verified: true },
      }),
      // Activate user and mark email as verified
      prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          emailVerified: new Date(),
        },
      }),
      // Clean up old verification tokens (from email link flow)
      prisma.verificationToken.deleteMany({
        where: {
          identifier: verificationCode.email || "",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Account verified successfully",
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
