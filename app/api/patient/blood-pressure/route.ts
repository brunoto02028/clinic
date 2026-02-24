export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";

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
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;
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

    // Send BP_HIGH_ALERT if reading is high (Stage 1 hypertension or above)
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (sys >= 130 || dia >= 80) {
      const classification = sys >= 180 || dia >= 120
        ? 'Hypertensive Crisis'
        : sys >= 140 || dia >= 90
        ? 'Stage 2 Hypertension'
        : 'Stage 1 Hypertension';
      const isCrisis = sys >= 180 || dia >= 120;
      const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
      notifyPatient({
        patientId: userId,
        emailTemplateSlug: 'BP_HIGH_ALERT',
        emailVars: {
          bpReading: `${sys}/${dia} mmHg`,
          readingDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          classification,
          portalUrl: `${BASE}/dashboard/blood-pressure`,
        },
        plainMessage: isCrisis
          ? `🚨 HYPERTENSIVE CRISIS: Your reading of ${sys}/${dia} mmHg requires IMMEDIATE medical attention. Call 999/112 or go to A&E now.`
          : `⚠️ High BP Alert: Your reading of ${sys}/${dia} mmHg is classified as ${classification}. Please contact your healthcare provider.`,
      }).catch(err => console.error('[bp] alert notification error:', err));
    }

    return NextResponse.json({ reading });
  } catch (error) {
    console.error("Error creating BP reading:", error);
    return NextResponse.json({ error: "Failed to save reading" }, { status: 500 });
  }
}
