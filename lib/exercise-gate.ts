import { prisma } from "@/lib/db";
import {
  getExerciseBpLimits,
  evaluateClearance,
  READING_VALID_MINUTES,
} from "@/lib/automation/exercise-bp";

/**
 * The training block, enforced where it cannot be clicked around.
 *
 * It started as a banner and a disabled button, and QA walked straight past it:
 * the same exercise could be ticked on the day strip below the card, and a
 * direct call to the API never asked at all. A block that lives only in the
 * screen is a suggestion — and this one exists because someone's blood
 * pressure is over 200/110.
 *
 * Only **today** is refused. Marking last Tuesday is correcting a record, not
 * training, and refusing it would make the block a punishment for having
 * measured.
 */
export async function isTrainingBlockedToday(patientId: string, dateStr: string): Promise<{
  blocked: boolean;
  systolic?: number;
  diastolic?: number;
  limits?: { blockSystolic: number; blockDiastolic: number };
}> {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  if (dateStr !== today) return { blocked: false };

  try {
    const me = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    const since = new Date(Date.now() - READING_VALID_MINUTES * 60_000);
    const [limits, reading] = await Promise.all([
      getExerciseBpLimits(me?.clinicId ?? null),
      (prisma as any).bloodPressureReading.findFirst({
        where: { patientId, measuredAt: { gte: since } },
        orderBy: { measuredAt: "desc" },
        select: { systolic: true, diastolic: true, measuredAt: true },
      }),
    ]);
    const clearance = evaluateClearance(reading, limits);
    if (!clearance.blocked) return { blocked: false };
    return {
      blocked: true,
      systolic: clearance.reading?.systolic,
      diastolic: clearance.reading?.diastolic,
      limits: { blockSystolic: limits.blockSystolic, blockDiastolic: limits.blockDiastolic },
    };
  } catch (e: any) {
    // A check that could not run must not stop a patient from recording what
    // they did. The block comes from a measurement, never from our outage.
    console.error("[exercise-gate] check failed, allowing:", e?.message);
    return { blocked: false };
  }
}

/** The refusal body, in both languages, for the screens that show it. */
export function trainingBlockedResponse(info: Awaited<ReturnType<typeof isTrainingBlockedToday>>) {
  const reading = info.systolic && info.diastolic ? `${info.systolic}/${info.diastolic}` : "";
  const limit = info.limits ? `${info.limits.blockSystolic}/${info.limits.blockDiastolic}` : "";
  return {
    error: `Today's session is blocked: your reading of ${reading} mmHg is above the ${limit} limit we use to clear exercise.`,
    errorPt: `A sessão de hoje está bloqueada: sua leitura de ${reading} mmHg está acima do limite de ${limit} que usamos para liberar o exercício.`,
    blocked: true,
  };
}
