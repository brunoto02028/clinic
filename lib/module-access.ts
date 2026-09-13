import { prisma } from "@/lib/db";
import { AccessError } from "@/lib/tenant-access";
import { computePatientAccess, PATIENT_ACCESS_SELECT } from "@/lib/patient-access";
import { getModuleByKey } from "@/lib/module-registry";

/**
 * Guards a module's server-side data behind the same "effective access" rules
 * the admin permissions screen and /api/patient/access already compute
 * (lib/patient-access.ts) — plan grant, admin override, full-access override.
 * Until now only the UI read that computation; a patient hitting the route
 * directly got the data regardless of what their plan included.
 *
 * Fails closed: no patient record, or the module missing from the effective
 * set, both throw. Call only for the module's own data route — a route the
 * patient reaches through impersonation resolves to their own record (see
 * getEffectiveUser), so a staff preview sees exactly what the patient would.
 */
export async function assertModuleAccess(userId: string, moduleKey: string): Promise<void> {
  const patient = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: PATIENT_ACCESS_SELECT,
  });
  if (!patient) throw new AccessError(404, "Not found");

  const access = computePatientAccess(patient);
  if (!access.modules.includes(moduleKey)) {
    const mod = getModuleByKey(moduleKey);
    throw new AccessError(403, `${mod?.label || "This module"} is not included in your plan`);
  }
}
