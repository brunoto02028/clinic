import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { getEffectiveUserId, isPreviewRequest } from "@/lib/preview-helpers";

// Generate unique assessment number
async function generateAssessmentNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BA-${year}-`;

  const last = await (prisma as any).bodyAssessment.findFirst({
    where: { assessmentNumber: { startsWith: prefix } },
    orderBy: { assessmentNumber: "desc" },
  });

  let nextNumber = 1;
  if (last) {
    const lastNumber = parseInt(last.assessmentNumber.replace(prefix, ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

// GET - List body assessments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const effectiveId = getEffectiveUserId(session, request);
    const isPreview = isPreviewRequest(session, request);
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build query based on role
    const whereClause: any = {};

    if (user.role === "PATIENT" || isPreview) {
      whereClause.patientId = isPreview ? effectiveId : user.id;
    } else if (user.clinicId) {
      whereClause.clinicId = user.clinicId;
      if (patientId) whereClause.patientId = patientId;
    } else if (user.role === "SUPERADMIN") {
      // SUPERADMIN sees all
      if (patientId) whereClause.patientId = patientId;
    }

    if (status) whereClause.status = status;

    if (search) {
      whereClause.OR = [
        { assessmentNumber: { contains: search, mode: "insensitive" } },
        { patient: { firstName: { contains: search, mode: "insensitive" } } },
        { patient: { lastName: { contains: search, mode: "insensitive" } } },
        { patient: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const assessments = await (prisma as any).bodyAssessment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("Error fetching body assessments:", error);
    return NextResponse.json(
      { error: "Failed to fetch body assessments" },
      { status: 500 }
    );
  }
}

// POST - Create new body assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { patientId } = body;

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine patient ID and clinic
    const actualPatientId = user.role === "PATIENT" ? user.id : patientId;

    if (!actualPatientId) {
      return NextResponse.json(
        { error: "Patient ID required" },
        { status: 400 }
      );
    }

    // Get patient's clinic — try user's clinicId first, then patient's
    let clinicId = user.clinicId;
    if (!clinicId && actualPatientId !== user.id) {
      const patient = await prisma.user.findUnique({
        where: { id: actualPatientId },
        select: { clinicId: true },
      });
      clinicId = patient?.clinicId || null;
    }
    if (!clinicId) {
      // Try to find any clinic as fallback
      const anyClinic = await (prisma as any).clinic.findFirst({ select: { id: true } });
      clinicId = anyClinic?.id || null;
    }

    const assessmentNumber = await generateAssessmentNumber();

    // Generate capture token (for QR/link-based mobile capture)
    const captureToken = crypto.randomBytes(32).toString("hex");
    const captureTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const assessment = await (prisma as any).bodyAssessment.create({
      data: {
        assessmentNumber,
        ...(clinicId ? { clinicId } : {}),
        patientId: actualPatientId,
        therapistId:
          user.role !== "PATIENT" ? user.id : undefined,
        captureToken,
        captureTokenExpiry,
        status: "PENDING_CAPTURE",
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    console.error("Error creating body assessment:", error);
    return NextResponse.json(
      { error: "Failed to create body assessment" },
      { status: 500 }
    );
  }
}
