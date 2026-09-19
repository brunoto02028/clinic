import { prisma } from "@/lib/db";

/** The module/permission overrides a brand-new patient of this clinic should
 * start with (activity 62) — an admin-configured baseline, snapshotted onto
 * the patient's own `moduleOverrides` at creation time so a later change to
 * the clinic default never retroactively changes an existing patient. Every
 * creation path (public signup, Google OAuth, admin-created patient, mobile
 * app, voice-AI guest booking) calls this before writing the new `User` row. */
export async function getDefaultPatientModuleOverrides(
  clinicId: string | null | undefined
): Promise<Record<string, boolean> | undefined> {
  if (!clinicId) return undefined;
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { defaultPatientModuleOverrides: true },
  });
  const overrides = clinic?.defaultPatientModuleOverrides as Record<string, boolean> | null | undefined;
  return overrides && Object.keys(overrides).length > 0 ? overrides : undefined;
}
