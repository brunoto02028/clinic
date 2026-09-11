import { prisma } from "@/lib/db";
import { computeMealMacros } from "@/lib/food";
import type { FoodBasis } from "@prisma/client";

// Shared helpers for composing a Meal from catalog foods (activity 31). Used by
// the meal-plan POST/PUT so both share one contract:
//   foods absent    → leave macros as the manual values (protects activity 27)
//   foods non-empty → macros computed from the foods (server source of truth)
//   foods []        → clear foods, fall back to the manual values
// The tenant/foodId validation is server-side (never trusts client clinicId).

export interface FoodRef {
  basis: FoodBasis;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
export type FoodMap = Map<string, FoodRef>;

interface RawMealFood { foodId: string; quantity: number; order?: number }
interface RawMeal {
  foods?: RawMealFood[];
  kcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
}

/** All distinct foodIds referenced across the meals. */
function collectFoodIds(mealsRaw: RawMeal[]): string[] {
  return Array.from(
    new Set(mealsRaw.flatMap((m) => (Array.isArray(m.foods) ? m.foods.map((f) => f.foodId) : [])))
  );
}

/**
 * Loads every referenced food, scoped to the tenant. `requireActive` is true for
 * POST (a new plan can't reference a soft-deleted food) and false for PUT (an
 * already-linked inactive food may be re-sent — G2). Returns the map plus any
 * ids not found in the tenant's catalog, so the caller can answer 400.
 */
export async function loadFoodMap(
  clinicId: string,
  mealsRaw: RawMeal[],
  requireActive: boolean
): Promise<{ map: FoodMap; missing: string[] }> {
  const ids = collectFoodIds(mealsRaw);
  if (ids.length === 0) return { map: new Map(), missing: [] };
  const foods = await prisma.food.findMany({
    where: { id: { in: ids }, clinicId, ...(requireActive ? { isActive: true } : {}) },
    select: { id: true, basis: true, kcal: true, proteinG: true, carbsG: true, fatG: true },
  });
  const map: FoodMap = new Map(foods.map((f) => [f.id, f]));
  const missing = ids.filter((id) => !map.has(id));
  return { map, missing };
}

/** true when the meal is composed from foods (a non-empty foods array). */
export function hasFoods(mealRaw: RawMeal): boolean {
  return Array.isArray(mealRaw.foods) && mealRaw.foods.length > 0;
}

/** Whether the payload provided a foods key at all (absent = don't touch). */
export function foodsProvided(mealRaw: RawMeal): boolean {
  return Array.isArray(mealRaw.foods);
}

/** The macro fields to store on the Meal: computed when foods present, else manual. */
export function mealMacroFields(mealRaw: RawMeal, foodMap: FoodMap) {
  if (hasFoods(mealRaw)) {
    const items = mealRaw.foods!.map((f) => ({ food: foodMap.get(f.foodId)!, quantity: safeQty(f.quantity) }));
    return computeMealMacros(items);
  }
  return {
    kcal: mealRaw.kcal ?? null,
    proteinG: mealRaw.proteinG ?? null,
    carbsG: mealRaw.carbsG ?? null,
    fatG: mealRaw.fatG ?? null,
  };
}

const MAX_QTY = 100000;
/** A safe non-negative quantity (guards NaN/negative/overflow from client input). */
function safeQty(v: unknown): number {
  const q = Number(v);
  return Number.isFinite(q) && q >= 0 ? Math.min(q, MAX_QTY) : 0;
}

/** Nested MealFood rows to create for a meal. */
export function mealFoodCreate(mealRaw: RawMeal) {
  const foods = Array.isArray(mealRaw.foods) ? mealRaw.foods : [];
  return foods.map((f, i) => ({ foodId: f.foodId, quantity: safeQty(f.quantity), order: typeof f.order === "number" ? f.order : i }));
}
