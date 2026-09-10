import { prisma } from "@/lib/db";
import { getDefaultClinicId } from "@/lib/default-tenant";

export interface JoinTenant {
  clinicId: string;
  name: string;
  slug: string;
  type: string;
}

/**
 * The tenant a new account joins. An explicit slug must name an active clinic,
 * else it is rejected (null) — a sign-up link to a missing/inactive studio does
 * not silently fall through to someone else's tenant. With no slug, the default
 * tenant (DEFAULT_CLINIC_SLUG, or the only active clinic). Null means "no tenant
 * could be resolved" — the caller answers 404/409 rather than creating a
 * tenant-less account (the ISO-10 leak).
 */
export async function resolveJoinTenant(slug?: string | null): Promise<JoinTenant | null> {
  if (slug) {
    const clinic = await prisma.clinic.findFirst({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true, type: true },
    });
    return clinic ? { clinicId: clinic.id, name: clinic.name, slug: clinic.slug, type: clinic.type } : null;
  }
  const defaultId = await getDefaultClinicId();
  if (!defaultId) return null;
  const clinic = await prisma.clinic.findUnique({
    where: { id: defaultId },
    select: { id: true, name: true, slug: true, type: true },
  });
  return clinic ? { clinicId: clinic.id, name: clinic.name, slug: clinic.slug, type: clinic.type } : null;
}
