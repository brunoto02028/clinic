import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List prescriptions (optionally filtered by patient)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clinicId = (session.user as any)?.clinicId;
  const patientId = searchParams.get("patientId");
  const exerciseId = searchParams.get("exerciseId");
  const activeOnly = searchParams.get("active") !== "false";

  const where: any = {};
  if (clinicId) where.clinicId = clinicId;
  if (patientId) where.patientId = patientId;
  if (exerciseId) where.exerciseId = exerciseId;
  if (activeOnly) where.isActive = true;

  try {
    const prescriptions = await prisma.exercisePrescription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            bodyRegion: true,
            difficulty: true,
            videoUrl: true,
            thumbnailUrl: true,
            description: true,
            instructions: true,
            duration: true,
            defaultSets: true,
            defaultReps: true,
            defaultHoldSec: true,
            defaultRestSec: true,
          },
        },
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ prescriptions });
  } catch (err: any) {
    console.error("Prescriptions GET error:", err);
    return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
  }
}

// POST - Prescribe exercises to a patient (bulk)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const clinicId = (session.user as any)?.clinicId;
    const therapistId = (session.user as any)?.id;

    if (!clinicId) {
      return NextResponse.json({ error: "No clinic context" }, { status: 400 });
    }

    const { patientId, exercises } = body;
    // exercises: Array<{ exerciseId, sets?, reps?, holdSeconds?, restSeconds?, frequency?, notes?, startDate?, endDate? }>

    if (!patientId || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: "Patient and at least one exercise are required" }, { status: 400 });
    }

    // Verify patient exists
    const patient = await prisma.user.findFirst({
      where: { id: patientId, clinicId, role: "PATIENT" },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const created = await prisma.$transaction(
      exercises.map((ex: any) =>
        prisma.exercisePrescription.create({
          data: {
            clinicId,
            therapistId,
            patientId,
            exerciseId: ex.exerciseId,
            sets: ex.sets || null,
            reps: ex.reps || null,
            holdSeconds: ex.holdSeconds || null,
            restSeconds: ex.restSeconds || null,
            frequency: ex.frequency || null,
            notes: ex.notes || null,
            startDate: ex.startDate ? new Date(ex.startDate) : new Date(),
            endDate: ex.endDate ? new Date(ex.endDate) : null,
          },
        })
      )
    );

    return NextResponse.json({ prescriptions: created, count: created.length }, { status: 201 });
  } catch (err: any) {
    console.error("Prescription POST error:", err);
    return NextResponse.json({ error: "Failed to create prescriptions" }, { status: 500 });
  }
}

// PATCH - Update a prescription (deactivate, update sets/reps, etc.)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Prescription ID required" }, { status: 400 });
    }

    const prescription = await prisma.exercisePrescription.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ prescription });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update prescription" }, { status: 500 });
  }
}
