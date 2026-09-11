import { prisma } from "@/lib/db";
import { AccessError, type Actor } from "@/lib/tenant-access";
import {
  assertTrainingAccess,
  assertStudentTrainingAccess,
  isTrainingEnabled,
} from "@/lib/workout-access";

// Nutrition shares the TRAINING module gate with workouts for v1. These thin
// wrappers let nutrition become its own ClinicModuleAccess key later without
// touching any route.

export function isNutritionEnabled(clinicId: string): Promise<boolean> {
  return isTrainingEnabled(clinicId);
}

/** Staff of a tenant with nutrition on. Throws AccessError otherwise. */
export function assertNutritionAccess(actor: Actor): Promise<string> {
  return assertTrainingAccess(actor);
}

/** A student whose tenant has nutrition on. Returns their tenant id. */
export function assertStudentNutritionAccess(actor: Actor): Promise<string> {
  return assertStudentTrainingAccess(actor);
}

/**
 * Loads a meal plan the student owns, or 404. A student may only read/log their
 * OWN plan (studentId === actor.userId).
 */
export async function assertMealPlanForStudent(
  actor: Actor,
  planId: string
): Promise<{ id: string; clinicId: string; studentId: string; status: string }> {
  const plan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    select: { id: true, clinicId: true, studentId: true, status: true },
  });
  if (!plan || plan.studentId !== actor.userId) throw new AccessError(404, "Not found");
  return plan;
}
