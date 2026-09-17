import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// GET - Validate token and return patient basic info (public, no auth)
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

// POST - Patient updates their profile via intake link (public, no auth)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { token } = params;

  const user = await prisma.user.findUnique({
    where: { intakeToken: token },
    select: { id: true, intakeTokenExpiry: true, email: true, moduleOverrides: true, profileCompleted: true },
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

  // Check if email was changed from the one set by the clinic
  const isEmailChanged = email.toLowerCase().trim() !== user.email.toLowerCase();

  // If email is changed, check it's not already taken
  if (isEmailChanged) {
    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), id: { not: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "This email is already in use by another account" }, { status: 409 });
    }
  }

  // Check duplicate phone number
  if (phone?.trim()) {
    const normalizedPhone = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');
    const allWithPhone = await prisma.user.findMany({
      where: { phone: { not: null }, role: "PATIENT", id: { not: user.id } },
      select: { id: true, phone: true },
    });
    const match = allWithPhone.find(p => {
      const pNorm = (p.phone || '').replace(/\s+/g, '').replace(/^\+/, '');
      return pNorm === normalizedPhone;
    });
    if (match) {
      return NextResponse.json(
        { error: "This phone number is already registered with another patient. Please use a different number or contact the clinic." },
        { status: 409 }
      );
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

  // Auto-unlock consultation booking, but only on the patient's first-ever
  // intake completion — not on a link re-sent later (e.g. to update contact
  // details), which would otherwise silently re-grant free booking access to
  // an established patient an admin may have already restricted. See
  // activity 50.
  const isFirstCompletion = !user.profileCompleted;

  if (isFirstCompletion) {
    // mod_appointments is gated behind an active subscription/treatment
    // package (see lib/patient-access.ts) — a brand-new patient has neither,
    // so without this override ModuleGate blocks /dashboard/appointments
    // before the ServiceAccess grant below is ever reached. Only set it if
    // it was never touched — `undefined` means "never set"; `false` means an
    // admin explicitly revoked it, which this must not override.
    const existingOverrides = (user.moduleOverrides as Record<string, boolean | string> | null) || {};
    if (existingOverrides.mod_appointments === undefined) {
      updateData.moduleOverrides = { ...existingOverrides, mod_appointments: true };
    }
  }

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

  // FIX 1: Invalidate token after successful completion to prevent reuse
  updateData.intakeToken = null;
  updateData.intakeTokenExpiry = null;

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  // Auto-grant consultation booking access so a new patient can go straight
  // to /dashboard/appointments without the admin liberating it manually per
  // patient (activity 50). Only on first completion (see isFirstCompletion
  // above) and best-effort: never fails the signup itself.
  try {
    if (isFirstCompletion) {
      const existingAccess = await prisma.serviceAccess.findFirst({
        where: { patientId: user.id, serviceType: "CONSULTATION" },
        select: { id: true },
      });
      if (!existingAccess) {
        await prisma.serviceAccess.create({
          data: { patientId: user.id, serviceType: "CONSULTATION", granted: true, paid: false },
        });
      }
    }
  } catch (err) {
    console.error("Failed to auto-grant consultation access on intake:", err);
  }

  return NextResponse.json({ success: true, message: "Profile updated successfully" });
}
