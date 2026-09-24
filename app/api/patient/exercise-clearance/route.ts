export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { patientGate } from "@/lib/patient-gate";
import {
  getExerciseBpLimits,
  evaluateClearance,
  READING_VALID_MINUTES,
} from "@/lib/automation/exercise-bp";

/**
 * Whether today's session opens, and why not when it does not.
 *
 * Asked by the exercise screen before it lets anyone start. The answer is the
 * patient's own most recent blood-pressure reading measured against the
 * clinic's training limits (T-11) — never against the home-monitoring
 * thresholds of T-3, which are a different question about the same number.
 *
 * Its own endpoint rather than a field on the exercise list, so the web and the
 * app ask the same thing and get the same answer, and so a screen can re-ask
 * after a new reading without reloading the whole list.
 */
export async function GET(_req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_exercises" });
  if (__gate.response) return __gate.response;

  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = effectiveUser.userId;
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });

    // Only inside the validity window: an older reading is not evidence about
    // now, and evaluateClearance would discard it anyway. Asking for it
    // narrowly keeps the query cheap on a patient with years of readings.
    const since = new Date(Date.now() - READING_VALID_MINUTES * 60_000);
    const [limits, reading] = await Promise.all([
      getExerciseBpLimits(me?.clinicId ?? null),
      (prisma as any).bloodPressureReading.findFirst({
        where: { patientId: userId, measuredAt: { gte: since } },
        orderBy: { measuredAt: "desc" },
        select: { systolic: true, diastolic: true, measuredAt: true },
      }),
    ]);

    return NextResponse.json(evaluateClearance(reading, limits));
  } catch (error: any) {
    console.error("[exercise-clearance] error:", error?.message);
    // A failure here must not read as "cleared" — the screen is told the
    // question could not be answered and decides what to show.
    return NextResponse.json({ error: "Could not check clearance" }, { status: 500 });
  }
}
