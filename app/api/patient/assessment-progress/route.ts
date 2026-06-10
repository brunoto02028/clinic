// API: Returns the patient's progress through the full assessment flow
// Checks: Screening → Outcome Measures → Body Assessment → Foot Scan

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, clinicId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check Medical Screening
  const screening = await prisma.medicalScreening.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      isSubmitted: true,
      chiefComplaint: true,
      painScore: true,
      painLevel: true,
      painLocation: true,
      consentGiven: true,
      redFlagDetails: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Check Body Assessment (most recent)
  const bodyAssessment = await prisma.bodyAssessment.findFirst({
    where: { patientId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      assessmentNumber: true,
      status: true,
      frontImageUrl: true,
      backImageUrl: true,
      leftImageUrl: true,
      rightImageUrl: true,
      postureScore: true,
      symmetryScore: true,
      mobilityScore: true,
      overallScore: true,
      aiSummary: true,
      correctiveExercises: true,
      captureToken: true,
      captureTokenExpiry: true,
      createdAt: true,
    },
  });

  // Check Foot Scan (most recent)
  const footScan = await prisma.footScan.findFirst({
    where: { patientId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      scanNumber: true,
      status: true,
      archType: true,
      pronation: true,
      aiRecommendation: true,
      leftFootLength: true,
      rightFootLength: true,
      scanToken: true,
      scanTokenExpiry: true,
      createdAt: true,
    },
  });

  // Check outcome measures
  let outcomeMeasures = null;
  if (screening) {
    try {
      const details = (screening as any).redFlagDetails as any;
      if (details?.outcomeMeasures) {
        outcomeMeasures = details.outcomeMeasures;
      }
    } catch {}
  }

  // Calculate overall progress
  const steps = [
    {
      id: "screening",
      label: "Medical Screening",
      labelPt: "Triagem Médica",
      status: screening?.isSubmitted ? "completed" : screening ? "in_progress" : "pending",
      data: screening,
    },
    {
      id: "outcome_measures",
      label: "Pain & Function Measures",
      labelPt: "Medidas de Dor e Função",
      status: outcomeMeasures?.vasScore !== undefined ? "completed" : "pending",
      data: outcomeMeasures,
    },
    {
      id: "body_assessment",
      label: "Posture Assessment",
      labelPt: "Avaliação Postural",
      status: bodyAssessment?.frontImageUrl
        ? bodyAssessment.postureScore
          ? "completed"
          : "processing"
        : bodyAssessment
          ? "in_progress"
          : "pending",
      data: bodyAssessment,
    },
    {
      id: "foot_scan",
      label: "Foot Scan",
      labelPt: "Scan dos Pés",
      status: footScan
        ? footScan.status === "APPROVED" || footScan.status === "DELIVERED"
          ? "completed"
          : footScan.status === "PENDING_UPLOAD"
            ? "in_progress"
            : "processing"
        : "pending",
      data: footScan,
    },
    {
      id: "results",
      label: "View Results",
      labelPt: "Ver Resultados",
      status:
        bodyAssessment?.postureScore && footScan?.aiRecommendation
          ? "completed"
          : bodyAssessment?.postureScore || footScan?.aiRecommendation
            ? "partial"
            : "pending",
      data: null,
    },
  ];

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // Determine next action
  let nextStep = steps.find((s) => s.status === "pending" || s.status === "in_progress");

  return NextResponse.json({
    steps,
    completedCount,
    totalSteps,
    progressPercent,
    nextStep: nextStep?.id || null,
    userId: user.id,
    clinicId: user.clinicId,
  });
}
