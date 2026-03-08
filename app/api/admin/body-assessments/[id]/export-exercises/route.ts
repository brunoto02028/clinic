import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// POST - Export corrective exercises from body assessment as ExercisePrescriptions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const clinicId = (session.user as any).clinicId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "THERAPIST" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (!assessment.correctiveExercises || !Array.isArray(assessment.correctiveExercises) || assessment.correctiveExercises.length === 0) {
      return NextResponse.json(
        { error: "No corrective exercises found. Run AI analysis first." },
        { status: 400 }
      );
    }

    const exercises = assessment.correctiveExercises as any[];
    const created: any[] = [];

    for (const ex of exercises) {
      // Try to find an existing exercise in the library by name
      let exercise = await (prisma as any).exercise.findFirst({
        where: {
          clinicId: clinicId || undefined,
          isActive: true,
          name: { equals: ex.name, mode: "insensitive" },
        },
      });

      // If not found, create a new exercise in the library
      if (!exercise) {
        exercise = await (prisma as any).exercise.create({
          data: {
            clinicId: clinicId || "",
            createdById: userId,
            name: ex.name || "Corrective Exercise",
            description: [ex.benefits, ex.finding ? `Addresses: ${ex.finding}` : null].filter(Boolean).join("\n"),
            instructions: ex.instructions || "",
            bodyRegion: (ex.targetArea || "FULL_BODY").toUpperCase().replace(/\s+/g, "_"),
            difficulty: (ex.difficulty || "beginner").toUpperCase(),
            defaultSets: ex.sets || 3,
            defaultReps: ex.reps || 10,
            defaultHoldSec: ex.holdSeconds || null,
            musclesTargeted: ex.musclesTargeted || [],
            isActive: true,
          },
        });
      }

      // Check if prescription already exists for this patient + exercise
      const existing = await (prisma as any).exercisePrescription.findFirst({
        where: {
          patientId: assessment.patientId,
          exerciseId: exercise.id,
          isActive: true,
        },
      });

      if (existing) {
        created.push({ ...existing, _status: "already_exists" });
        continue;
      }

      // Create the prescription
      const prescription = await (prisma as any).exercisePrescription.create({
        data: {
          clinicId: clinicId || "",
          therapistId: userId,
          patientId: assessment.patientId,
          exerciseId: exercise.id,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          holdSeconds: ex.holdSeconds || null,
          frequency: "Daily",
          notes: `From body assessment ${assessment.assessmentNumber}. ${ex.finding ? `Addresses: ${ex.finding}.` : ""} ${ex.benefits || ""}`.trim(),
          isActive: true,
          startDate: new Date(),
        },
        include: {
          exercise: { select: { id: true, name: true } },
        },
      });

      created.push({ ...prescription, _status: "created" });
    }

    const newCount = created.filter((c) => c._status === "created").length;
    const existingCount = created.filter((c) => c._status === "already_exists").length;

    return NextResponse.json({
      success: true,
      created: newCount,
      alreadyExisted: existingCount,
      total: created.length,
      prescriptions: created,
    });
  } catch (error) {
    console.error("Error exporting exercises:", error);
    return NextResponse.json(
      { error: "Failed to export exercises" },
      { status: 500 }
    );
  }
}
