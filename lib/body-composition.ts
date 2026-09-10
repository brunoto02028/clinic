// Body-composition maths for the personal-trainer assessments (activity 21).
// Metric units: weight kg, height cm, skinfolds mm, girths cm. Pure — no
// imports — so it is used by API routes and unit tests alike.

export type Sex = "M" | "F";

/** BMI = kg / m². Null if inputs missing/invalid. */
export function bmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!isPos(weightKg) || !isPos(heightCm)) return null;
  const m = (heightCm as number) / 100;
  return round1((weightKg as number) / (m * m));
}

/** Waist-to-hip ratio from girths (cm). */
export function waistToHip(waistCm?: number | null, hipCm?: number | null): number | null {
  if (!isPos(waistCm) || !isPos(hipCm)) return null;
  return round2((waistCm as number) / (hipCm as number));
}

/** Fat mass (kg) and lean mass (kg) from weight and %BF. */
export function masses(weightKg?: number | null, bodyFatPct?: number | null): { fatMassKg: number | null; leanMassKg: number | null } {
  if (!isPos(weightKg) || bodyFatPct == null || bodyFatPct < 0 || bodyFatPct > 75) {
    return { fatMassKg: null, leanMassKg: null };
  }
  const fat = round1((weightKg as number) * (bodyFatPct / 100));
  return { fatMassKg: fat, leanMassKg: round1((weightKg as number) - fat) };
}

export interface Skinfolds {
  chest?: number;
  abdomen?: number;
  thigh?: number;
  triceps?: number;
  suprailiac?: number;
  subscapular?: number;
  midaxillary?: number;
}

// Site sets for the Jackson-Pollock formulas, by sex.
const JP3_SITES: Record<Sex, (keyof Skinfolds)[]> = {
  M: ["chest", "abdomen", "thigh"],
  F: ["triceps", "suprailiac", "thigh"],
};
const JP7_SITES: (keyof Skinfolds)[] = ["chest", "midaxillary", "triceps", "subscapular", "abdomen", "suprailiac", "thigh"];

function sumSites(sf: Skinfolds, sites: (keyof Skinfolds)[]): number | null {
  let sum = 0;
  for (const s of sites) {
    const v = sf[s];
    if (!isPos(v)) return null; // every required site must be present & positive
    sum += v as number;
  }
  return sum;
}

/** Siri equation: %BF from body density. */
function siri(density: number): number {
  return 495 / density - 450;
}

/**
 * %BF from skinfolds via Jackson-Pollock (3-site if the 3-site set is complete,
 * else 7-site) → Siri. Needs sex and age. Returns null if inputs are incomplete.
 */
export function bodyFatFromSkinfolds(sf: Skinfolds, sex: Sex, age: number): number | null {
  if (!sf || (sex !== "M" && sex !== "F") || !isPos(age)) return null;

  // Prefer the more accurate 7-site when all 7 are present; else the 3-site set.
  const sum7 = sumSites(sf, JP7_SITES);
  if (sum7 != null) {
    const density =
      sex === "M"
        ? 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 * sum7 - 0.00028826 * age
        : 1.097 - 0.00046971 * sum7 + 0.00000056 * sum7 * sum7 - 0.00012828 * age;
    return clampBf(round1(siri(density)));
  }

  const sum3 = sumSites(sf, JP3_SITES[sex]);
  if (sum3 != null) {
    const density =
      sex === "M"
        ? 1.10938 - 0.0008267 * sum3 + 0.0000016 * sum3 * sum3 - 0.0002574 * age
        : 1.0994921 - 0.0009929 * sum3 + 0.0000023 * sum3 * sum3 - 0.0001392 * age;
    return clampBf(round1(siri(density)));
  }

  return null;
}

/** Estimated 1RM (kg) via Epley from a set's reps and load. */
export function epley1RM(loadKg?: number | null, reps?: number | null): number | null {
  if (!isPos(loadKg) || !isPos(reps)) return null;
  if ((reps as number) === 1) return round1(loadKg as number);
  return round1((loadKg as number) * (1 + (reps as number) / 30));
}

// ── helpers ──
function isPos(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}
function clampBf(v: number): number | null {
  return v >= 2 && v <= 75 ? v : null; // physiologically implausible → reject
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
