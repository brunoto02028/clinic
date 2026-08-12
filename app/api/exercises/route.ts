import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

// GET - Patient's prescribed exercises
export async function GET(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = effectiveUser.userId;

  try {
    const prescriptions = await prisma.exercisePrescription.findMany({
      where: {
        patientId: userId,
        isActive: true,
      },
      orderBy: [{ exercise: { bodyRegion: "asc" } }, { createdAt: "desc" }],
      include: {
        exercise: {
          select: {
            id: true,
            name: true,
            description: true,
            instructions: true,
            // Portuguese translations (filled by the admin "Traduzir PT" action)
            namePt: true,
            descriptionPt: true,
            instructionsPt: true,
            folderId: true,
            folder: { select: { id: true, name: true } },
            bodyRegion: true,
            difficulty: true,
            videoUrl: true,
            thumbnailUrl: true,
            duration: true,
            defaultSets: true,
            defaultReps: true,
            defaultHoldSec: true,
            defaultRestSec: true,
          },
        },
        therapist: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ prescriptions });
  } catch (err: any) {
    console.error("Patient exercises GET error:", err);
    return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
  }
}

// PATCH - Mark exercise as completed (patient action)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;

  try {
    const { prescriptionId, action } = await req.json();

    if (!prescriptionId) {
      return NextResponse.json({ error: "Prescription ID required" }, { status: 400 });
    }

    // Verify the prescription belongs to the patient
    const prescription = await prisma.exercisePrescription.findFirst({
      where: { id: prescriptionId, patientId: userId },
    });

    if (!prescription) {
      return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
    }

    // "undo" reverts an accidental tap — decrements the counter (never below 0)
    // and clears the completed timestamp once back at 0.
    if (action === "undo") {
      const nextCount = Math.max(0, prescription.completedCount - 1);
      const updated = await prisma.exercisePrescription.update({
        where: { id: prescriptionId },
        data: {
          completedCount: nextCount,
          lastCompletedAt: nextCount === 0 ? null : prescription.lastCompletedAt,
        },
      });
      return NextResponse.json({ prescription: updated });
    }

    const updated = await prisma.exercisePrescription.update({
      where: { id: prescriptionId },
      data: {
        completedCount: { increment: 1 },
        lastCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ prescription: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
