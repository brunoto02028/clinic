import { prisma } from "@/lib/db";

/**
 * Resolves the clinicId for a session user.
 * SUPERADMIN users may not have clinicId set on their User record,
 * so we fall back to the first clinic in the DB.
 */
export async function resolveClinicId(session: any): Promise<string | null> {
  const fromSession = (session?.user as any)?.clinicId as string | undefined;
  if (fromSession) return fromSession;

  const userId = (session?.user as any)?.id as string | undefined;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { clinicId: true },
    });
    if (user?.clinicId) return user.clinicId;
  }

  const first = await prisma.clinic.findFirst({ select: { id: true } });
  return first?.id ?? null;
}
