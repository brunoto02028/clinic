// Assembles + validates a StudentAssessment from request input and computes the
// server-side derivations (BMI, WHR, resolved %BF, fat/lean mass). Activity 21.
import {
  bmi as calcBmi,
  waistToHip,
  masses,
  bodyFatFromSkinfolds,
  type Sex,
  type Skinfolds,
} from "@/lib/body-composition";

export type BfMethod = "MANUAL" | "BIA" | "SKINFOLD";

export interface AssessmentInput {
  performedAt?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  sex?: string | null;
  bfMethod?: BfMethod;
  bodyFatPct?: number | null;
  skinfolds?: Skinfolds | null;
  bia?: { bodyFatPct?: number; muscleMassKg?: number; bodyWaterPct?: number; visceralFat?: number } | null;
  restingHr?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  girths?: Record<string, number> | null;
  notes?: string | null;
}

const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bfInRange = (v: number): boolean => v >= 2 && v <= 75;
const inRange = (v: number | null): number | null => (v != null && bfInRange(v) ? v : null);
const pos = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;
const intInRange = (v: unknown, lo: number, hi: number): boolean =>
  v == null || (typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi);

/** Returns an error message, or null when the input is valid. */
export function validateAssessment(a: AssessmentInput): string | null {
  if (a.weightKg != null && !(typeof a.weightKg === "number" && a.weightKg > 0 && a.weightKg < 500)) return "weightKg must be 0–500";
  if (a.heightCm != null && !(typeof a.heightCm === "number" && a.heightCm > 0 && a.heightCm < 300)) return "heightCm must be 0–300";
  if (a.bodyFatPct != null && !(typeof a.bodyFatPct === "number" && bfInRange(a.bodyFatPct))) return "bodyFatPct must be 2–75";
  // BIA %BF is stored as the final %BF for the BIA method — range-check it too.
  if (a.bia?.bodyFatPct != null && !(typeof a.bia.bodyFatPct === "number" && bfInRange(a.bia.bodyFatPct))) return "bia.bodyFatPct must be 2–75";
  if (!intInRange(a.restingHr, 20, 250)) return "restingHr must be 20–250";
  if (!intInRange(a.systolic, 50, 300)) return "systolic must be 50–300";
  if (!intInRange(a.diastolic, 30, 200)) return "diastolic must be 30–200";
  for (const [k, v] of Object.entries(a.girths || {})) if (v != null && !pos(v)) return `girth ${k} must be > 0`;
  // A skinfold of 0 is not a valid measurement and would silently disable the
  // calc; require a positive value when a site is provided.
  for (const [k, v] of Object.entries((a.skinfolds as Record<string, unknown>) || {})) if (v != null && !pos(v)) return `skinfold ${k} must be > 0`;
  return null;
}

/** Computes the derived fields for storage. `age` from the student's DOB. */
export function deriveAssessment(a: AssessmentInput, age: number | null): {
  bodyFatPct: number | null;
  bmi: number | null;
  whr: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
} {
  const method: BfMethod = a.bfMethod || "MANUAL";
  let bodyFatPct: number | null = null;
  if (method === "MANUAL") bodyFatPct = inRange(numOrNull(a.bodyFatPct));
  else if (method === "BIA") bodyFatPct = inRange(numOrNull(a.bia?.bodyFatPct));
  else if (method === "SKINFOLD") {
    const sex = (a.sex === "M" || a.sex === "F" ? a.sex : null) as Sex | null;
    bodyFatPct = sex && age != null && age > 0 ? bodyFatFromSkinfolds((a.skinfolds || {}) as Skinfolds, sex, age) : null;
  }

  const girths = a.girths || {};
  const { fatMassKg, leanMassKg } = masses(a.weightKg ?? null, bodyFatPct);
  return {
    bodyFatPct,
    bmi: calcBmi(a.weightKg ?? null, a.heightCm ?? null),
    whr: waistToHip(numOrNull(girths.waist), numOrNull(girths.hip)),
    leanMassKg,
    fatMassKg,
  };
}

/** Whole years from a date of birth. */
export function ageFromDob(dob: Date | null | undefined): number | null {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}
