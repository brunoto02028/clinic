import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET — Validate token and return patient basic info (public, no auth)
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const user = await prisma.user.findUnique({
    where: { intakeToken: token },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      dateOfBirth: true,
      address: true,
      profileCompleted: true,
      intakeTokenExpiry: true,
      consentAcceptedAt: true,
      preferredLocale: true,
      clinic: { select: { name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  if (user.intakeTokenExpiry && new Date(user.intakeTokenExpiry) < new Date()) {
    return NextResponse.json({ error: "This link has expired. Please contact the clinic for a new one." }, { status: 410 });
  }

  return NextResponse.json({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split("T")[0] : "",
    address: user.address || "",
    profileCompleted: user.profileCompleted,
    consentAccepted: !!user.consentAcceptedAt,
    preferredLocale: user.preferredLocale,
    clinicName: user.clinic?.name || "BPR Clinic",
  });
}

// POST — Patient updates their profile via intake link (public, no auth)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const user = await prisma.user.findUnique({
    where: { intakeToken: token },
    select: { id: true, intakeTokenExpiry: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  if (user.intakeTokenExpiry && new Date(user.intakeTokenExpiry) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    address,
    password,
    preferredLocale,
    acceptConsent,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
  } = body;

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "First name, last name, and email are required" }, { status: 400 });
  }

  // Check if email is already taken by another user
  if (email !== (await prisma.user.findUnique({ where: { intakeToken: token }, select: { email: true } }))?.email) {
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), id: { not: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "This email is already in use by another account" }, { status: 409 });
    }
  }

  // Build update data
  const updateData: any = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || null,
    address: address?.trim() || null,
    profileCompleted: true,
  };

  if (dateOfBirth) {
    updateData.dateOfBirth = new Date(dateOfBirth);
  }

  if (preferredLocale && ["en-GB", "pt-BR"].includes(preferredLocale)) {
    updateData.preferredLocale = preferredLocale;
  }

  if (emergencyContactName) updateData.emergencyContactName = emergencyContactName.trim();
  if (emergencyContactPhone) updateData.emergencyContactPhone = emergencyContactPhone.trim();
  if (emergencyContactRelation) updateData.emergencyContactRelation = emergencyContactRelation.trim();

  // Hash new password if provided
  if (password && password.length >= 8) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  // Accept consent if requested
  if (acceptConsent) {
    updateData.consentAcceptedAt = new Date();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return NextResponse.json({ success: true, message: "Profile updated successfully" });
}
