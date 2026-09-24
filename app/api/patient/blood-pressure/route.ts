export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { afterBloodPressureRecorded } from "@/lib/bp-alerts";

// GET — list patient's own BP readings
export async function GET(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = effectiveUser.userId;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    const readings = await (prisma as any).bloodPressureReading.findMany({
      where: { patientId: userId, measuredAt: { gte: since } },
      orderBy: { measuredAt: "desc" },
    });

    return NextResponse.json({ readings });
  } catch (error) {
    console.error("Error fetching BP readings:", error);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 });
  }
}

// POST — create a new BP reading
export async function POST(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

    const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true, firstName: true, lastName: true } }); const clinicId = _u?.clinicId || null;
    const body = await request.json();

    const { systolic, diastolic, heartRate, method, notes, confidence, ppgSignal } = body;

    if (!systolic || !diastolic) {
      return NextResponse.json({ error: "Systolic and diastolic values are required" }, { status: 400 });
    }

    if (systolic < 50 || systolic > 300 || diastolic < 30 || diastolic > 200) {
      return NextResponse.json({ error: "Blood pressure values out of valid range" }, { status: 400 });
    }

    if (diastolic >= systolic) {
      return NextResponse.json({ error: "Diastolic must be lower than systolic" }, { status: 400 });
    }

    const reading = await (prisma as any).bloodPressureReading.create({
      data: {
        patientId: userId,
        clinicId,
        systolic: parseInt(systolic),
        diastolic: parseInt(diastolic),
        heartRate: heartRate ? parseInt(heartRate) : null,
        method: method || "MANUAL",
        notes: notes || null,
        confidence: confidence || null,
        ppgSignal: ppgSignal || null,
      },
    });

    // Classification, the clinic's alert and the patient's crisis message all
    // live in lib/bp-alerts.ts now, because this stopped being the only way a
    // reading arrives: the Withings webhook, the clinic's cuff and a manual
    // assignment all write readings too, and none of them alerted anyone.
    await afterBloodPressureRecorded({
      patientId: userId,
      clinicId,
      systolic: parseInt(systolic),
      diastolic: parseInt(diastolic),
      measuredAt: reading.measuredAt ?? new Date(),
      via: "app",
    });

    return NextResponse.json({ reading });
  } catch (error) {
    console.error("Error creating BP reading:", error);
    return NextResponse.json({ error: "Failed to save reading" }, { status: 500 });
  }
}
