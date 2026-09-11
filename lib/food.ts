// Food catalog validation + meal macro computation (activity 31). Pure helpers;
// the API layer enforces access and persists. computeMealMacros is the server
// source of truth for a food-composed meal's macros.

import type { FoodBasis } from "@prisma/client";

export interface FoodInput {
  name: string;
  basis: FoodBasis;
  unitLabel?: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const MAX_KCAL = 100000; // per basis, generous
const MAX_G = 100000;
const BASES: FoodBasis[] = ["PER_100G", "PER_UNIT"];

/** Validates a food payload. Returns an error message or null. */
export function validateFood(input: FoodInput): string | null {
  if (!input || typeof input.name !== "string" || input.name.trim() === "") return "Name is required";
  if (input.name.length > 200) return "Name is too long";
  if (!BASES.includes(input.basis)) return "Basis is invalid";
  if (input.unitLabel !== undefined && (typeof input.unitLabel !== "string" || input.unitLabel.length > 40)) return "Unit label is invalid";
  const nums: Array<[unknown, number]> = [
    [input.kcal, MAX_KCAL],
    [input.proteinG, MAX_G],
    [input.carbsG, MAX_G],
    [input.fatG, MAX_G],
  ];
  for (const [v, max] of nums) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max) return "Macros are invalid";
  }
  if (!Number.isInteger(input.kcal)) return "Calories must be a whole number";
  return null;
}

/** Multiplier applied to a food's per-basis macros for a given quantity. */
export function factor(basis: FoodBasis, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity < 0) return 0;
  return basis === "PER_100G" ? quantity / 100 : quantity;
}

export interface MacroTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface MealFoodItem {
  food: { basis: FoodBasis; kcal: number; proteinG: number; carbsG: number; fatG: number };
  quantity: number;
}

/**
 * Sums a meal's macros from its foods. Accumulates in float and rounds ONLY the
 * total (kcal → integer, macros → 1 decimal) to avoid per-item rounding drift.
 */
export function computeMealMacros(items: MealFoodItem[]): MacroTotals {
  let kcal = 0, proteinG = 0, carbsG = 0, fatG = 0;
  for (const it of items) {
    const f = factor(it.food.basis, it.quantity);
    kcal += it.food.kcal * f;
    proteinG += it.food.proteinG * f;
    carbsG += it.food.carbsG * f;
    fatG += it.food.fatG * f;
  }
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return { kcal: Math.round(kcal), proteinG: round1(proteinG), carbsG: round1(carbsG), fatG: round1(fatG) };
}
