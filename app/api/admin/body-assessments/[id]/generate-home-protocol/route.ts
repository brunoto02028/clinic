import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// POST - Generate home-based treatment protocol from body assessment
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

    // Get the body assessment with all analysis data
    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
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

    // Check if a diagnosis already exists for this assessment
    let diagnosis = await (prisma as any).aIDiagnosis.findFirst({
      where: { bodyAssessmentId: params.id },
    });

    // Create AIDiagnosis from assessment data if not exists
    if (!diagnosis) {
      diagnosis = await (prisma as any).aIDiagnosis.create({
        data: {
          clinicId: clinicId || "",
          patientId: assessment.patientId,
          therapistId: userId,
          hasBodyAssessment: true,
          bodyAssessmentId: params.id,
          summary: assessment.aiSummary || "Body assessment analysis — home-based protocol generated from corrective exercises.",
          conditions: assessment.aiFindings?.map((f: any) => ({
            name: f.area || f.finding,
            description: f.finding || "",
            severity: f.severity || "mild",
            bodyRegion: f.area || "",
            confidence: "high",
          })) || [],
          findings: assessment.aiFindings || [],
          recommendations: assessment.aiRecommendations
            ? [{ type: "exercise", description: assessment.aiRecommendations, priority: "high" }]
            : [],
          references: [],
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
    }

    // Build protocol from corrective exercises
    const exercises = assessment.correctiveExercises as any[];
    const protocolTitle = `Home-Based Corrective Protocol — ${assessment.patient.firstName} ${assessment.patient.lastName}`;
    const protocolSummary = assessment.aiSummary
      ? `Based on biomechanical assessment findings: ${assessment.aiSummary.substring(0, 300)}`
      : "Home-based corrective exercise protocol generated from body assessment analysis.";

    // Create TreatmentProtocol
    const protocol = await (prisma as any).treatmentProtocol.create({
      data: {
        clinicId: clinicId || "",
        patientId: assessment.patientId,
        therapistId: userId,
        diagnosisId: diagnosis.id,
        title: protocolTitle,
        summary: protocolSummary,
        goals: [
          {
            phase: "SHORT_TERM",
            goal: "Address acute postural imbalances and pain points",
            timeline: "Weeks 1-4",
            metrics: "Reduced discomfort, improved body awareness",
          },
          {
            phase: "MEDIUM_TERM",
            goal: "Strengthen weak muscle groups and improve flexibility",
            timeline: "Weeks 4-12",
            metrics: "Improved posture scores, increased ROM",
          },
          {
            phase: "LONG_TERM",
            goal: "Maintain corrections and prevent recurrence",
            timeline: "Weeks 12+",
            metrics: "Sustained posture improvement on follow-up assessment",
          },
        ],
        precautions: [
          {
            precaution: "Stop any exercise that causes sharp pain. Mild discomfort is normal.",
            severity: "medium",
          },
          {
            precaution: "Perform exercises on a flat, non-slip surface.",
            severity: "low",
          },
        ],
        references: [],
        estimatedWeeks: 12,
        deliveryMode: "REMOTE",
        status: "DRAFT",
      },
    });

    // Create ProtocolItems from corrective exercises
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i];
      const isBeginnerOrIntermediate = ex.difficulty === "beginner" || ex.difficulty === "intermediate";
      const phase = isBeginnerOrIntermediate ? "SHORT_TERM" : "MEDIUM_TERM";

      // Try to find matching exercise in exercise library
      let matchedExerciseId: string | null = null;
      if (ex.name) {
        const match = await (prisma as any).exercise.findFirst({
          where: {
            clinicId: clinicId || undefined,
            isActive: true,
            name: { contains: ex.name, mode: "insensitive" },
          },
          select: { id: true },
        });
        if (match) matchedExerciseId = match.id;
      }

      await (prisma as any).protocolItem.create({
        data: {
          protocolId: protocol.id,
          phase,
          itemType: "HOME_EXERCISE",
          sortOrder: i,
          title: ex.name || `Exercise ${i + 1}`,
          description: `${ex.benefits || ""}\nTarget: ${ex.targetArea || ""}\nAddresses: ${ex.finding || ""}`.trim(),
          instructions: ex.instructions || null,
          bodyRegion: (ex.targetArea || "").toUpperCase(),
          exerciseId: matchedExerciseId,
          sets: ex.sets || 3,
          reps: ex.reps || 10,
          holdSeconds: ex.holdSeconds || null,
          frequency: "Daily",
          startWeek: isBeginnerOrIntermediate ? 1 : 4,
          endWeek: isBeginnerOrIntermediate ? 12 : null,
          daysPerWeek: 5,
          references: [],
        },
      });
    }

    // Also add self-care items based on findings
    if (assessment.aiRecommendations) {
      await (prisma as any).protocolItem.create({
        data: {
          protocolId: protocol.id,
          phase: "SHORT_TERM",
          itemType: "HOME_CARE",
          sortOrder: exercises.length,
          title: "Self-Care & Ergonomic Recommendations",
          description: assessment.aiRecommendations,
          instructions: "Follow these recommendations daily to support your recovery and postural improvement.",
          frequency: "Daily",
          startWeek: 1,
          daysPerWeek: 7,
          references: [],
        },
      });
    }

    // Return full protocol
    const fullProtocol = await (prisma as any).treatmentProtocol.findUnique({
      where: { id: protocol.id },
      include: {
        therapist: { select: { firstName: true, lastName: true } },
        diagnosis: { select: { id: true, summary: true } },
        items: {
          orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
          include: {
            exercise: { select: { id: true, name: true, videoUrl: true, thumbnailUrl: true } },
          },
        },
      },
    });

    return NextResponse.json(fullProtocol);
  } catch (error) {
    console.error("Error generating home protocol:", error);
    return NextResponse.json(
      { error: "Failed to generate home protocol" },
      { status: 500 }
    );
  }
}
