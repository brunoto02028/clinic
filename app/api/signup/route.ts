export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { sendTemplatedEmail } from "@/lib/email-templates";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, role } = body ?? {};

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, password, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Public signup ALWAYS creates PATIENT accounts (admin/therapist created via /api/admin/patients)
    const userRole = UserRole.PATIENT;

    // Create user and verification token in a transaction
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: userRole,
        // Account disabled until verified
        isActive: false,
      },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token,
        expires,
      },
    });

    // Send welcome email (verification now handled via 6-digit code on /verify page)
    try {
      const appUrl = process.env.NEXTAUTH_URL || "";

      // Fetch clinic phone from settings
      let clinicPhone = process.env.CLINIC_PHONE || "";
      try {
        const settings = await prisma.siteSettings.findFirst();
        if (settings?.phone) clinicPhone = settings.phone;
      } catch {}

      await sendTemplatedEmail('WELCOME', email.toLowerCase(), {
        patientName: firstName,
        portalUrl: `${appUrl}/dashboard`,
        clinicPhone: clinicPhone || "Contact us via the website",
      }, user.id);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
