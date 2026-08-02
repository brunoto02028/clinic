// API: Returns the patient's progress through the initial assessment flow
// Checks: Screening → Outcome Measures

import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/dual-auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
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
