import { prisma } from "@/lib/db";
import { AccessError, type Actor } from "@/lib/tenant-access";
import { isPersonalTenant } from "@/lib/tenant-type";
import { type WorkoutExerciseInput } from "@/lib/workout-validation";

export { validateExerciseInput, validateExercises } from "@/lib/workout-validation";
export type { WorkoutExerciseInput } from "@/lib/workout-validation";

// TRAINING module gating + input validation for the workout product (T-20).
// The clinical prescription is untouched; this governs only Workout* rows.

/**
 * Whether the strength-training module is on for a tenant. Default-on for a
 * personal-trainer studio; any tenant can be switched on/off explicitly via a
 * ClinicModuleAccess row, which wins over the default.
 */
export async function isTrainingEnabled(clinicId: string): Promise<boolean> {
  const [clinic, access] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId }, select: { type: true } }),
    prisma.clinicModuleAccess.findUnique({
      where: { clinicId_module: { clinicId, module: "TRAINING" } },
      select: { isEnabled: true },
    }),
  ]);
  if (access) return access.isEnabled;
  return isPersonalTenant(clinic?.type);
}

/** Staff of a tenant with TRAINING on. Throws AccessError otherwise. */
export async function assertTrainingAccess(actor: Actor): Promise<string> {
  if (actor.role === "PATIENT") throw new AccessError(403, "Forbidden");
  if (!actor.clinicId) throw new AccessError(403, "No tenant resolved for this account");
  if (!(await isTrainingEnabled(actor.clinicId))) throw new AccessError(404, "Not found");
  return actor.clinicId;
}

/**
 * Confirms every referenced exercise belongs to the tenant — a workout may not
 * point at another studio's exercise (cross-tenant leak). Returns an error
 * message or null.
 */
export async function assertExercisesInTenant(
  clinicId: string,
  exercises: WorkoutExerciseInput[]
): Promise<string | null> {
  const ids = Array.from(new Set(exercises.map((e) => e.exerciseId)));
  if (ids.length === 0) return null;
  const found = await prisma.exercise.findMany({
    where: { id: { in: ids }, clinicId },
    select: { id: true },
  });
  if (found.length !== ids.length) return "One or more exercises are not in this tenant";
  return null;
}
