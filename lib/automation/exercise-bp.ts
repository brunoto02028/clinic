import { prisma } from "@/lib/db";
import type { ThresholdProblem } from "@/lib/automation/bp-bands";

/**
 * Blood pressure as a gate on training, which is not the same thing as blood
 * pressure as a reading.
 *
 * T-3 put 130/80 and 180/120 in a rule: those classify a measurement taken at
 * home and decide who gets told. These decide whether today's session happens
 * at all — above 200/110 the session is blocked, above 250/115 the instruction
 * is to stop immediately (ACSM criteria, via the commercial plan).
 *
 * Two sets of numbers on the same quantity is the confusion risk this activity
 * wrote down in advance, so they live in separate files, under separate rule
 * codes, with separate words on screen. Nobody should be able to lower the
 * home alert and silently unblock training, or the reverse.
 */
export const EXERCISE_BP_RULE = "EXERCISE_BP_LIMITS";

/** ACSM, as the commercial plan states them. */
export const EXERCISE_BP_DEFAULTS = {
  blockSystolic: 200,
  blockDiastolic: 110,
  stopSystolic: 250,
  stopDiastolic: 115,
} as const;

/**
 * How long a reading speaks for.
 *
 * A measurement from this morning says nothing about this afternoon, and
 * pretending otherwise cuts both ways: it would block someone whose pressure
 * has since come down, and clear someone whose has since gone up. Outside the
 * window there is no measurement, and "no measurement" is its own answer.
 */
export const READING_VALID_MINUTES = 60;

export interface ExerciseBpLimits {
  blockSystolic: number;
  blockDiastolic: number;
  stopSystolic: number;
  stopDiastolic: number;
}

/**
 * The range a limit may sit in.
 *
 * Same lesson as T-3, where a threshold of 600 passed an ordering check and
 * then swallowed a real crisis: a number outside the plausible band is a typo,
 * and on a safety path a typo must not be accepted quietly.
 */
export const EXERCISE_BP_RANGE = {
  block: { systolic: { min: 140, max: 240 }, diastolic: { min: 80, max: 140 } },
  stop: { systolic: { min: 160, max: 280 }, diastolic: { min: 90, max: 160 } },
} as const;

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Why a configuration is unusable, in both languages (see bp-bands.ts). */
export function exerciseBpProblem(l: ExerciseBpLimits): ThresholdProblem | null {
  const within = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max;
  if (
    !within(l.blockSystolic, EXERCISE_BP_RANGE.block.systolic) ||
    !within(l.blockDiastolic, EXERCISE_BP_RANGE.block.diastolic)
  ) {
    const b = EXERCISE_BP_RANGE.block;
    return {
      en: `The blocking limit must be between ${b.systolic.min}/${b.diastolic.min} and ${b.systolic.max}/${b.diastolic.max} mmHg`,
      pt: `O limite de bloqueio tem de ficar entre ${b.systolic.min}/${b.diastolic.min} e ${b.systolic.max}/${b.diastolic.max} mmHg`,
    };
  }
  if (
    !within(l.stopSystolic, EXERCISE_BP_RANGE.stop.systolic) ||
    !within(l.stopDiastolic, EXERCISE_BP_RANGE.stop.diastolic)
  ) {
    const st = EXERCISE_BP_RANGE.stop;
    return {
      en: `The stop-immediately limit must be between ${st.systolic.min}/${st.diastolic.min} and ${st.systolic.max}/${st.diastolic.max} mmHg`,
      pt: `O limite de interrupção tem de ficar entre ${st.systolic.min}/${st.diastolic.min} e ${st.systolic.max}/${st.diastolic.max} mmHg`,
    };
  }
  if (l.stopSystolic <= l.blockSystolic || l.stopDiastolic <= l.blockDiastolic) {
    return {
      en: "The stop-immediately limit must be higher than the blocking limit, on both numbers",
      pt: "O limite de interrupção tem de ser maior que o de bloqueio, nos dois números",
    };
  }
  return null;
}

export function exerciseLimitsAreSane(l: ExerciseBpLimits): boolean {
  return exerciseBpProblem(l) === null;
}

export function limitsFromCondition(condition: unknown): ExerciseBpLimits {
  const data = (condition ?? {}) as Record<string, unknown>;
  return {
    blockSystolic: num(data.blockSystolic) ?? EXERCISE_BP_DEFAULTS.blockSystolic,
    blockDiastolic: num(data.blockDiastolic) ?? EXERCISE_BP_DEFAULTS.blockDiastolic,
    stopSystolic: num(data.stopSystolic) ?? EXERCISE_BP_DEFAULTS.stopSystolic,
    stopDiastolic: num(data.stopDiastolic) ?? EXERCISE_BP_DEFAULTS.stopDiastolic,
  };
}

export async function getExerciseBpLimits(clinicId: string | null): Promise<ExerciseBpLimits> {
  if (!clinicId) return { ...EXERCISE_BP_DEFAULTS };
  try {
    // Own rule, then the platform's global one, then the constants — the same
    // fall-through as T-3, so switching a clinic's rule off means "use what is
    // behind it", never "stop blocking".
    const [own, global] = await Promise.all([
      prisma.automationRule.findFirst({
        where: { code: EXERCISE_BP_RULE, clinicId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.automationRule.findFirst({
        where: { code: EXERCISE_BP_RULE, clinicId: null },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    for (const rule of [own, global]) {
      if (!rule || !rule.active) continue;
      const merged = limitsFromCondition(rule.condition);
      if (exerciseLimitsAreSane(merged)) return merged;
    }
    return { ...EXERCISE_BP_DEFAULTS };
  } catch (e) {
    console.error("[exercise-bp] falling back to defaults:", e);
    return { ...EXERCISE_BP_DEFAULTS };
  }
}

export interface ClearanceReading {
  systolic: number;
  diastolic: number;
  measuredAt: Date | string;
}

export type ClearanceState = "CLEAR" | "BLOCKED" | "NO_RECENT_READING" | "OVERRIDDEN";

export interface Clearance {
  state: ClearanceState;
  blocked: boolean;
  limits: ExerciseBpLimits;
  reading: { systolic: number; diastolic: number; measuredAt: string } | null;
  /** Minutes the reading is still valid for, when there is one. */
  validForMinutes: number | null;
  override?: { grantedBy: string | null; grantedAt: string; expiresAt: string; reason: string | null };
}

/**
 * Whether today's session opens.
 *
 * `NO_RECENT_READING` is deliberately not a block. A clinic can require a
 * measurement before every session, but that is a different decision, and
 * making "no data" mean "no training" here would stop every patient who does
 * not own a monitor — most of them.
 */
export function evaluateClearance(
  reading: ClearanceReading | null,
  limits: ExerciseBpLimits,
  now: Date = new Date(),
  validMinutes: number = READING_VALID_MINUTES
): Clearance {
  if (!reading) {
    return { state: "NO_RECENT_READING", blocked: false, limits, reading: null, validForMinutes: null };
  }
  const measuredAt = new Date(reading.measuredAt);
  const ageMinutes = (now.getTime() - measuredAt.getTime()) / 60_000;
  if (ageMinutes > validMinutes || ageMinutes < 0) {
    return { state: "NO_RECENT_READING", blocked: false, limits, reading: null, validForMinutes: null };
  }
  const blocked = reading.systolic > limits.blockSystolic || reading.diastolic > limits.blockDiastolic;
  return {
    state: blocked ? "BLOCKED" : "CLEAR",
    blocked,
    limits,
    reading: {
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      measuredAt: measuredAt.toISOString(),
    },
    validForMinutes: Math.max(0, Math.round(validMinutes - ageMinutes)),
  };
}

/** Above this, the instruction is to stop the session that is already running. */
export function shouldStopNow(systolic: number, diastolic: number, limits: ExerciseBpLimits): boolean {
  return systolic > limits.stopSystolic || diastolic > limits.stopDiastolic;
}
