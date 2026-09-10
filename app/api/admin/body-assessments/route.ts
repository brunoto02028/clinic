import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getActor, assertPatientAccess, accessErrorResponse } from "@/lib/tenant-access";
import crypto from "crypto";
import { getEffectiveUserId, isPreviewRequest } from "@/lib/preview-helpers";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

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

    // Read impersonation cookie directly (middleware does NOT inject headers for /api/admin/* routes)
    const cookieStore = cookies();
    const impersonatedPatientId = cookieStore.get("impersonate-patient-id")?.value;
    const isImpersonating = !!impersonatedPatientId;

    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query based on role. This route reads the impersonation cookie
    // itself, so the cookie only counts for staff, inside their own tenant.
    const whereClause: any = {};

    if (actor.role === "PATIENT") {
      whereClause.patientId = actor.userId;
    } else if (!actor.clinicId) {
      return NextResponse.json({ error: "No tenant resolved for this account" }, { status: 403 });
    } else {
      whereClause.clinicId = actor.clinicId;
      const scopedPatientId = isImpersonating ? impersonatedPatientId : patientId;
      if (scopedPatientId) whereClause.patientId = scopedPatientId;
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

    // Read impersonation cookie directly (middleware does NOT inject headers for /api/admin/* routes)
    const cookieStore = cookies();
    const impersonatedPatientId = cookieStore.get("impersonate-patient-id")?.value;

    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine patient ID:
    // - If patient role → their own ID
    // - If impersonating a patient → use the impersonated patient's ID
    // - If admin with explicit patientId → use that
    const actualPatientId =
      actor.role === "PATIENT" ? actor.userId :
      impersonatedPatientId || patientId;

    if (!actualPatientId) {
      return NextResponse.json(
        { error: "Patient ID required" },
        { status: 400 }
      );
    }

    // The assessment lives in the patient's tenant, which must be the actor's.
    let clinicId: string | null;
    try {
      clinicId = (await assertPatientAccess(actor, actualPatientId)).clinicId;
    } catch (err) {
      return accessErrorResponse(err);
    }
    if (!clinicId) {
      return NextResponse.json({ error: "This account is not linked to a clinic" }, { status: 409 });
    }

    const assessmentNumber = await generateAssessmentNumber();

    // Generate capture token (for QR/link-based mobile capture)
    const captureToken = crypto.randomBytes(32).toString("hex");
    const captureTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const assessment = await (prisma as any).bodyAssessment.create({
      data: {
        assessmentNumber,
        clinicId,
        patientId: actualPatientId,
        therapistId:
          actor.role !== "PATIENT" ? actor.userId : undefined,
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
