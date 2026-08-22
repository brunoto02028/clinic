// API: Store and retrieve patient outcome measures (VAS + FAAM)
//
// These used to live inside MedicalScreening.redFlagDetails, and when a patient
// had no screening the route created one just to have somewhere to put them —
// so recording a pain score gave the patient an intake record nobody had filled
// in, which then showed up on their file as a completed screening.
//
// Intake and progress are different things: one is answered once, the other
// accumulates over treatment. They have separate tables now.

import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/dual-auth";
import { prisma } from "@/lib/db";

// How far back a `range` value reaches, in days. `all` (or anything else) = no cutoff.
function rangeCutoff(range: string | null): Date | null {
  const days = range === "30d" ? 30 : range === "90d" ? 90 : null;
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
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

  // History mode: the full time series for the progress charts. The default
  // (no `history` param) still returns only the latest record, which the
  // outcome-measures form relies on to prefill.
  const { searchParams } = new URL(request.url);
  if (searchParams.get("history") === "true") {
    const cutoff = rangeCutoff(searchParams.get("range"));
    const rows = await (prisma as any).patientOutcomeMeasure.findMany({
      where: { patientId: user.id, ...(cutoff ? { recordedAt: { gte: cutoff } } : {}) },
      orderBy: { recordedAt: "asc" },
      select: {
        recordedAt: true,
        vasScore: true,
        faamAdlPercent: true,
        faamSportPercent: true,
        overallFunction: true,
      },
    });
    return NextResponse.json({ series: rows });
  }

  const latest = await (prisma as any).patientOutcomeMeasure.findFirst({
    where: { patientId: user.id },
    orderBy: { recordedAt: "desc" },
  });

  if (latest) {
    return NextResponse.json({
      measures: {
        vasScore: latest.vasScore,
        faamAdl: latest.faamAdl,
        faamSport: latest.faamSport,
        faamAdlPercent: latest.faamAdlPercent,
        faamSportPercent: latest.faamSportPercent,
        overallFunction: latest.overallFunction,
        recordedAt: latest.recordedAt,
      },
    });
  }

  // No measure recorded yet. The screening's own pain score, if the patient
  // gave one at intake, is a reasonable starting point for the form — but it
  // is read only, and nothing is written back to the screening.
  const screening = await prisma.medicalScreening.findUnique({
    where: { userId: user.id },
    select: { painLevel: true, painScore: true },
  });

  if (!screening) {
    return NextResponse.json({ measures: null });
  }

  return NextResponse.json({
    measures: {
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
  const session = await getRequestSession(req);
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

  const toInt = (v: any) => (v === null || v === undefined || v === "" ? null : Number(v));

  // Appended, never upserted: every recording is a point in the patient's
  // progress, and overwriting the last one would erase the trend the measure
  // exists to show.
  const measure = await (prisma as any).patientOutcomeMeasure.create({
    data: {
      patientId: user.id,
      clinicId: user.clinicId ?? null,
      vasScore: toInt(vasScore),
      faamAdl: toInt(faamAdl),
      faamSport: toInt(faamSport),
      faamAdlPercent: faamAdlPercent === null || faamAdlPercent === undefined ? null : Number(faamAdlPercent),
      faamSportPercent: faamSportPercent === null || faamSportPercent === undefined ? null : Number(faamSportPercent),
      overallFunction: toInt(overallFunction),
    },
  });

  return NextResponse.json({ success: true, measures: measure });
}
