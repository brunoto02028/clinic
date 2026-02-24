export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendTemplatedEmail } from "@/lib/email-templates";

// GET - list patients for admin (same as /api/patients but with clinic filter)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clinicId: true },
    });

    if (!user || user.role === "PATIENT") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const letter = searchParams.get("letter") || "";
    const limit = parseInt(searchParams.get("limit") || "100");

    const where: any = { role: "PATIENT" };
    if (user.clinicId && user.role !== "SUPERADMIN") {
      where.clinicId = user.clinicId;
    }

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Letter filter (first letter of firstName)
    if (letter && letter.length === 1) {
      where.firstName = { startsWith: letter, mode: "insensitive" };
    }

    const patients = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { firstName: "asc" },
      take: limit,
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching admin patients:", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

// POST - create a new patient (admin/staff only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clinicId: true },
    });

    if (!currentUser || currentUser.role === "PATIENT") {
      return NextResponse.json({ error: "Only staff can create patients" }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, dateOfBirth, password } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password (use default if not provided)
    const rawPassword = password || "Patient123!";
    const hashedPassword = await bcrypt.hash(rawPassword, 12);

    const patient = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone || null,
        
        role: "PATIENT",
        isActive: true,
        emailVerified: new Date(), // Mark as verified since admin created it
        clinicId: currentUser.clinicId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    // Send welcome email to patient
    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      await sendTemplatedEmail('WELCOME', email.toLowerCase(), {
        patientName: firstName.trim(),
        portalUrl: `${appUrl}/dashboard`,
        clinicPhone: '+44 7XXX XXXXXX',
      }, patient.id, currentUser.clinicId || undefined);
    } catch (emailErr) {
      console.warn('[patients] Failed to send welcome email:', emailErr);
    }

    return NextResponse.json(
      { patient, tempPassword: rawPassword === "Patient123!" ? rawPassword : undefined },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create patient" },
      { status: 500 }
    );
  }
}

// PATCH - update a patient's info
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clinicId: true },
    });

    if (!currentUser || currentUser.role === "PATIENT") {
      return NextResponse.json({ error: "Only staff can edit patients" }, { status: 403 });
    }

    const body = await request.json();
    const { patientId, firstName, lastName, email, phone, isActive } = body;

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    // Verify patient belongs to same clinic (unless SUPERADMIN)
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (currentUser.role !== "SUPERADMIN" && patient.clinicId !== currentUser.clinicId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.user.update({
      where: { id: patientId },
      data: updateData,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true,
      },
    });

    return NextResponse.json({ patient: updated });
  } catch (error: any) {
    console.error("Error updating patient:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || "Failed to update patient" }, { status: 500 });
  }
}

// DELETE - delete a patient
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clinicId: true },
    });

    if (!currentUser || !["SUPERADMIN", "ADMIN"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Only admins can delete patients" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    // Verify patient belongs to same clinic (unless SUPERADMIN)
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true, role: true } });
    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }
    if (currentUser.role !== "SUPERADMIN" && patient.clinicId !== currentUser.clinicId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id: patientId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting patient:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete patient" }, { status: 500 });
  }
}
