import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import crypto from "crypto";

// POST — Generate or refresh an intake token for a patient
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patientId = params.id;

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { id: true, role: true, firstName: true, lastName: true, email: true, intakeToken: true },
  });

  if (!patient || patient.role !== "PATIENT") {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  // Generate a secure token (48 chars, URL-safe)
  const token = crypto.randomBytes(32).toString("base64url");
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.user.update({
    where: { id: patientId },
    data: { intakeToken: token, intakeTokenExpiry: expiry },
  });

  // Build the intake URL
  const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
  const intakeUrl = `${baseUrl}/intake/${token}`;

  return NextResponse.json({
    intakeUrl,
    token,
    expiresAt: expiry.toISOString(),
    patient: { firstName: patient.firstName, lastName: patient.lastName, email: patient.email },
  });
}

// GET — Get current intake status for a patient
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const patient = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      intakeToken: true,
      intakeTokenExpiry: true,
      profileCompleted: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      consentAcceptedAt: true,
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
  const intakeUrl = patient.intakeToken ? `${baseUrl}/intake/${patient.intakeToken}` : null;
  const expired = patient.intakeTokenExpiry ? new Date(patient.intakeTokenExpiry) < new Date() : true;

  return NextResponse.json({
    intakeUrl,
    expiresAt: patient.intakeTokenExpiry,
    expired: !patient.intakeToken || expired,
    profileCompleted: patient.profileCompleted,
    consentAccepted: !!patient.consentAcceptedAt,
    hasRealEmail: !patient.email?.includes("@test.com") && !patient.email?.includes("@placeholder."),
  });
}
