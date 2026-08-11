import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { sendTemplatedEmail } from "@/lib/email-templates";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail, currentPassword } = await req.json();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: effectiveUser.userId },
      select: { id: true, email: true, firstName: true, password: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (!user.password) {
      return NextResponse.json({ error: "This account uses Google sign-in and has no password to verify." }, { status: 400 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const normalizedNewEmail = newEmail.toLowerCase();
    if (normalizedNewEmail === user.email.toLowerCase()) {
      return NextResponse.json({ error: "That's already your current email." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedNewEmail } });
    if (existing) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 400 });
    }

    // One pending request per user at a time
    await prisma.emailChangeToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.emailChangeToken.create({
      data: { userId: user.id, newEmail: normalizedNewEmail, token, expires },
    });

    const confirmUrl = `${process.env.NEXTAUTH_URL}/confirm-email?token=${token}`;

    await sendTemplatedEmail(
      "EMAIL_CHANGE_CONFIRMATION",
      normalizedNewEmail,
      { patientName: user.firstName, confirmUrl },
      user.id,
    );

    return NextResponse.json({
      message: "Check your new email address for a confirmation link.",
    });
  } catch (error) {
    console.error("Change email request error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
