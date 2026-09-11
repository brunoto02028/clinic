// Validation + macro/adherence helpers for the nutrition product (activity 27).
// Pure functions; the API layer enforces access. Macros are grams, energy kcal.
// Mirrors the validate-returns-(string|null) convention of lib/assessment.ts.

export interface MealInput {
  name: string;
  timeOfDay?: string | null;
  description?: string | null;
  kcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  order?: number;
}

export interface MealPlanInput {
  name: string;
  status?: string;
  targetKcal?: number | null;
  targetProteinG?: number | null;
  targetCarbsG?: number | null;
  targetFatG?: number | null;
  notes?: string | null;
  meals: MealInput[];
}

const MAX_KCAL = 20000;
const MAX_G = 5000;

/** true when a provided value is not a sane non-negative number within `max`. */
function badNum(v: unknown, max: number): boolean {
  if (v === undefined || v === null) return false;
  return typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max;
}

/** Validates a meal-plan payload. Returns an error message or null. */
export function validateMealPlan(input: MealPlanInput): string | null {
  if (!input || typeof input.name !== "string" || input.name.trim() === "") return "Plan name is required";
  if (input.name.length > 200) return "Plan name is too long";
  if (badNum(input.targetKcal, MAX_KCAL)) return "Target calories are invalid";
  if (badNum(input.targetProteinG, MAX_G) || badNum(input.targetCarbsG, MAX_G) || badNum(input.targetFatG, MAX_G)) {
    return "Target macros are invalid";
  }
  if (!Array.isArray(input.meals) || input.meals.length === 0) return "Add at least one meal";
  if (input.meals.length > 30) return "Too many meals";
  for (const m of input.meals) {
    if (!m || typeof m.name !== "string" || m.name.trim() === "") return "Each meal needs a name";
    if (m.name.length > 200) return "Meal name is too long";
    if (badNum(m.kcal, MAX_KCAL)) return "Meal calories are invalid";
    if (badNum(m.proteinG, MAX_G) || badNum(m.carbsG, MAX_G) || badNum(m.fatG, MAX_G)) return "Meal macros are invalid";
  }
  return null;
}

export interface MacroTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** Sums the planned macros across a plan's meals (nulls count as 0). */
export function sumMealMacros(
  meals: Array<Pick<MealInput, "kcal" | "proteinG" | "carbsG" | "fatG">>
): MacroTotals {
  return meals.reduce<MacroTotals>(
    (acc, m) => ({
      kcal: acc.kcal + (m.kcal ?? 0),
      proteinG: acc.proteinG + (m.proteinG ?? 0),
      carbsG: acc.carbsG + (m.carbsG ?? 0),
      fatG: acc.fatG + (m.fatG ?? 0),
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}

export interface Adherence {
  logged: number;
  planned: number;
  pct: number;
}

/**
 * Adherence over a period. planned = (active meals) × (days in range); logged =
 * distinct (mealId, loggedDate) pairs in the logs; pct clamped to [0,1]. Callers
 * pass logs already scoped to the period and the day is a date-only string
 * (YYYY-MM-DD) resolved in the tenant's timezone.
 */
export function adherence(
  logs: Array<{ mealId: string | null; loggedDate: Date | string }>,
  mealCount: number,
  rangeDays: number
): Adherence {
  const planned = Math.max(0, mealCount) * Math.max(0, rangeDays);
  const seen = new Set<string>();
  for (const l of logs) {
    if (!l.mealId) continue;
    const d = typeof l.loggedDate === "string" ? l.loggedDate.slice(0, 10) : l.loggedDate.toISOString().slice(0, 10);
    seen.add(`${l.mealId}|${d}`);
  }
  const logged = seen.size;
  const pct = planned === 0 ? 0 : Math.min(1, logged / planned);
  return { logged, planned, pct };
}
