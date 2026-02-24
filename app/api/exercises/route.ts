import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUserId } from "@/lib/preview-helpers";

export const dynamic = "force-dynamic";

// GET - Patient's prescribed exercises
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getEffectiveUserId(session, req);

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
    const { prescriptionId } = await req.json();

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
