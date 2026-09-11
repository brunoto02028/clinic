import { apiFetch } from "./client";

export interface Meal {
  id: string;
  name: string;
  timeOfDay: string | null;
  description: string | null;
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  order: number;
}

export interface MealLog {
  id: string;
  mealId: string | null;
  mealName: string;
  loggedDate: string;
  performedAt: string;
  note: string | null;
  photoUrl: string | null;
}

export interface MealPlan {
  id: string;
  name: string;
  targetKcal: number | null;
  targetProteinG: number | null;
  targetCarbsG: number | null;
  targetFatG: number | null;
  notes: string | null;
  meals: Meal[];
  logs: MealLog[];
}

/** The student's ACTIVE meal plan, or null when none is set. */
export function fetchMealPlan(): Promise<MealPlan | null> {
  return apiFetch<MealPlan | null>("/api/mobile/meal-plans");
}

export function markMeal(
  planId: string,
  body: { mealId: string; date: string; note?: string | null }
): Promise<MealLog> {
  return apiFetch<MealLog>(`/api/mobile/meal-plans/${planId}/logs`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function unmarkMeal(planId: string, mealId: string, date: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/api/mobile/meal-plans/${planId}/logs?mealId=${encodeURIComponent(mealId)}&date=${encodeURIComponent(date)}`,
    { method: "DELETE" }
  );
}
