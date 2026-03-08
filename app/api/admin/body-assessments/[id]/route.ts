import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET - Get single body assessment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error fetching body assessment:", error);
    return NextResponse.json(
      { error: "Failed to fetch body assessment" },
      { status: 500 }
    );
  }
}

// PUT - Update body assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "THERAPIST" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      therapistNotes,
      therapistFindings,
      motorPoints,
      frontImageUrl,
      frontImagePath,
      backImageUrl,
      backImagePath,
      leftImageUrl,
      leftImagePath,
      rightImageUrl,
      rightImagePath,
      frontAnnotatedUrl,
      backAnnotatedUrl,
      leftAnnotatedUrl,
      rightAnnotatedUrl,
      frontLandmarks,
      backLandmarks,
      leftLandmarks,
      rightLandmarks,
      captureMetadata,
      movementVideos,
      aiFindings,
      aiSummary,
      aiRecommendations,
      correctiveExercises,
      postureAnalysis: postureAnalysisUpdate,
      postureScore,
      symmetryScore,
      mobilityScore,
      overallScore,
      segmentScores,
      deviationLabels,
      idealComparison,
      // Anthropometric & Body Composition
      heightCm, weightKg, bmi, bmiClassification,
      waistCm, hipCm, waistHipRatio, neckCm, chestCm, thighCm, calfCm, armCm,
      bodyFatPercent, bodyFatMethod, leanMassKg, fatMassKg, visceralFatLevel, basalMetabolicRate,
      // Health Risk
      cardiovascularRisk, metabolicRisk, healthScore, healthRiskFactors,
      // Sedentary Profile
      sittingHoursPerDay, screenTimeHours, walkingMinutesDay, stepsPerDay,
      ergonomicScore, ergonomicAssessment, sedentaryRecommendations,
      // Activity
      activityLevel, sportModality,
    } = body;

    const updateData: any = {};

    // AI editable fields
    if (aiFindings !== undefined) updateData.aiFindings = aiFindings;
    if (aiSummary !== undefined) updateData.aiSummary = aiSummary;
    if (aiRecommendations !== undefined) updateData.aiRecommendations = aiRecommendations;
    if (correctiveExercises !== undefined) updateData.correctiveExercises = correctiveExercises;

    // Scores
    if (postureScore !== undefined) updateData.postureScore = postureScore;
    if (symmetryScore !== undefined) updateData.symmetryScore = symmetryScore;
    if (mobilityScore !== undefined) updateData.mobilityScore = mobilityScore;
    if (overallScore !== undefined) updateData.overallScore = overallScore;
    if (segmentScores !== undefined) updateData.segmentScores = segmentScores;
    if (deviationLabels !== undefined) updateData.deviationLabels = deviationLabels;
    if (idealComparison !== undefined) updateData.idealComparison = idealComparison;

    // Posture Analysis — merge with existing so sub-fields can be updated individually
    if (postureAnalysisUpdate !== undefined) {
      const existing = await (prisma as any).bodyAssessment.findUnique({
        where: { id: params.id },
        select: { postureAnalysis: true },
      });
      const merged = { ...(existing?.postureAnalysis || {}), ...postureAnalysisUpdate };
      updateData.postureAnalysis = merged;
    }

    // Image fields
    if (frontImageUrl !== undefined) updateData.frontImageUrl = frontImageUrl;
    if (frontImagePath !== undefined) updateData.frontImagePath = frontImagePath;
    if (backImageUrl !== undefined) updateData.backImageUrl = backImageUrl;
    if (backImagePath !== undefined) updateData.backImagePath = backImagePath;
    if (leftImageUrl !== undefined) updateData.leftImageUrl = leftImageUrl;
    if (leftImagePath !== undefined) updateData.leftImagePath = leftImagePath;
    if (rightImageUrl !== undefined) updateData.rightImageUrl = rightImageUrl;
    if (rightImagePath !== undefined) updateData.rightImagePath = rightImagePath;

    // Annotated images
    if (frontAnnotatedUrl !== undefined) updateData.frontAnnotatedUrl = frontAnnotatedUrl;
    if (backAnnotatedUrl !== undefined) updateData.backAnnotatedUrl = backAnnotatedUrl;
    if (leftAnnotatedUrl !== undefined) updateData.leftAnnotatedUrl = leftAnnotatedUrl;
    if (rightAnnotatedUrl !== undefined) updateData.rightAnnotatedUrl = rightAnnotatedUrl;

    // Landmarks
    if (frontLandmarks !== undefined) updateData.frontLandmarks = frontLandmarks;
    if (backLandmarks !== undefined) updateData.backLandmarks = backLandmarks;
    if (leftLandmarks !== undefined) updateData.leftLandmarks = leftLandmarks;
    if (rightLandmarks !== undefined) updateData.rightLandmarks = rightLandmarks;

    // Other data
    if (captureMetadata !== undefined) updateData.captureMetadata = captureMetadata;
    if (movementVideos !== undefined) updateData.movementVideos = movementVideos;
    if (motorPoints !== undefined) updateData.motorPoints = motorPoints;

    // Therapist fields
    if (therapistNotes !== undefined) updateData.therapistNotes = therapistNotes;
    if (therapistFindings !== undefined) updateData.therapistFindings = therapistFindings;

    // Anthropometric & Body Composition
    if (heightCm !== undefined) updateData.heightCm = heightCm;
    if (weightKg !== undefined) updateData.weightKg = weightKg;
    if (bmi !== undefined) updateData.bmi = bmi;
    if (bmiClassification !== undefined) updateData.bmiClassification = bmiClassification;
    if (waistCm !== undefined) updateData.waistCm = waistCm;
    if (hipCm !== undefined) updateData.hipCm = hipCm;
    if (waistHipRatio !== undefined) updateData.waistHipRatio = waistHipRatio;
    if (neckCm !== undefined) updateData.neckCm = neckCm;
    if (chestCm !== undefined) updateData.chestCm = chestCm;
    if (thighCm !== undefined) updateData.thighCm = thighCm;
    if (calfCm !== undefined) updateData.calfCm = calfCm;
    if (armCm !== undefined) updateData.armCm = armCm;
    if (bodyFatPercent !== undefined) updateData.bodyFatPercent = bodyFatPercent;
    if (bodyFatMethod !== undefined) updateData.bodyFatMethod = bodyFatMethod;
    if (leanMassKg !== undefined) updateData.leanMassKg = leanMassKg;
    if (fatMassKg !== undefined) updateData.fatMassKg = fatMassKg;
    if (visceralFatLevel !== undefined) updateData.visceralFatLevel = visceralFatLevel;
    if (basalMetabolicRate !== undefined) updateData.basalMetabolicRate = basalMetabolicRate;

    // Health Risk
    if (cardiovascularRisk !== undefined) updateData.cardiovascularRisk = cardiovascularRisk;
    if (metabolicRisk !== undefined) updateData.metabolicRisk = metabolicRisk;
    if (healthScore !== undefined) updateData.healthScore = healthScore;
    if (healthRiskFactors !== undefined) updateData.healthRiskFactors = healthRiskFactors;

    // Sedentary Profile
    if (sittingHoursPerDay !== undefined) updateData.sittingHoursPerDay = sittingHoursPerDay;
    if (screenTimeHours !== undefined) updateData.screenTimeHours = screenTimeHours;
    if (walkingMinutesDay !== undefined) updateData.walkingMinutesDay = walkingMinutesDay;
    if (stepsPerDay !== undefined) updateData.stepsPerDay = stepsPerDay;
    if (ergonomicScore !== undefined) updateData.ergonomicScore = ergonomicScore;
    if (ergonomicAssessment !== undefined) updateData.ergonomicAssessment = ergonomicAssessment;
    if (sedentaryRecommendations !== undefined) updateData.sedentaryRecommendations = sedentaryRecommendations;

    // Activity
    if (activityLevel !== undefined) updateData.activityLevel = activityLevel;
    if (sportModality !== undefined) updateData.sportModality = sportModality;

    // Status
    if (status) updateData.status = status;

    // If therapist is reviewing, record review timestamp
    if (status === "REVIEWED" || status === "COMPLETED") {
      updateData.reviewedAt = new Date();
    }

    const assessment = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Send notification when report is ready for the patient
    if (status === "REVIEWED" || status === "COMPLETED") {
      try {
        const { notifyPatient } = await import("@/lib/notify-patient");
        await notifyPatient({
          patientId: assessment.patient.id,
          emailTemplateSlug: "ASSESSMENT_COMPLETED",
          emailVars: {
            assessmentType: "Body Assessment",
            completedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
            portalUrl: `${process.env.NEXTAUTH_URL || ""}/dashboard/body-assessments`,
          },
          plainMessage: `Your body assessment report is ready! Log in to your portal to view your results, corrective exercises, and personalised recommendations.`,
          plainMessagePt: `Seu relatório de avaliação corporal está pronto! Acesse seu portal para ver seus resultados, exercícios corretivos e recomendações personalizadas.`,
        });
      } catch (notifyErr) {
        console.error("[body-assessment] Failed to send report-ready notification:", notifyErr);
      }
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error("Error updating body assessment:", error);
    return NextResponse.json(
      { error: "Failed to update body assessment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete body assessment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await (prisma as any).bodyAssessment.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting body assessment:", error);
    return NextResponse.json(
      { error: "Failed to delete body assessment" },
      { status: 500 }
    );
  }
}
