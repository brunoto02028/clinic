// API: Store and retrieve patient outcome measures (VAS + FAAM)
// Stored in MedicalScreening JSON fields

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const screening = await prisma.medicalScreening.findUnique({
    where: { userId: user.id },
    select: {
      painLevel: true,
      painScore: true,
      painTypes: true,
      painPatterns: true,
      painImpact: true,
      painNotes: true,
      redFlagDetails: true,
    },
  });

  if (!screening) {
    return NextResponse.json({ measures: null });
  }

  // Outcome measures stored in redFlagDetails JSON (reusing existing field for extensibility)
  // or we parse from painLevel/painScore
  let outcomeMeasures = null;
  try {
    const details = screening.redFlagDetails as any;
    if (details?.outcomeMeasures) {
      outcomeMeasures = details.outcomeMeasures;
    }
  } catch {}

  return NextResponse.json({
    measures: outcomeMeasures || {
      vasScore: screening.painLevel || screening.painScore || 0,
      faamAdl: {},
      faamSport: {},
      faamAdlPercent: null,
      faamSportPercent: null,
      overallFunction: 50,
    },
  });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { vasScore, faamAdl, faamSport, faamAdlPercent, faamSportPercent, overallFunction } = body;

  // Upsert medical screening with outcome measures
  const existing = await prisma.medicalScreening.findUnique({
    where: { userId: user.id },
    select: { id: true, redFlagDetails: true },
  });

  const outcomeMeasures = {
    vasScore,
    faamAdl,
    faamSport,
    faamAdlPercent,
    faamSportPercent,
    overallFunction,
    recordedAt: new Date().toISOString(),
  };

  // Preserve existing redFlagDetails and add outcomeMeasures
  const existingDetails = (existing?.redFlagDetails as any) || {};
  const updatedDetails = {
    ...existingDetails,
    outcomeMeasures,
    // Keep history of measures for comparison
    outcomeMeasuresHistory: [
      ...(existingDetails.outcomeMeasuresHistory || []),
      outcomeMeasures,
    ],
  };

  if (existing) {
    await prisma.medicalScreening.update({
      where: { userId: user.id },
      data: {
        painLevel: vasScore,
        painScore: vasScore,
        redFlagDetails: updatedDetails,
      },
    });
  } else {
    // Create screening if doesn't exist
    await prisma.medicalScreening.create({
      data: {
        userId: user.id,
        ...(user.clinicId ? { clinicId: user.clinicId } : {}),
        painLevel: vasScore,
        painScore: vasScore,
        redFlagDetails: updatedDetails,
      },
    });
  }

  return NextResponse.json({ success: true, measures: outcomeMeasures });
}
