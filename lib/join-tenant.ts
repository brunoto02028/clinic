import { prisma } from "@/lib/db";
import { getDefaultClinicId } from "@/lib/default-tenant";

export interface JoinTenant {
  clinicId: string;
  name: string;
  slug: string;
  type: string;
  logoUrl: string | null;
  primaryColor: string | null;
  instagramImportEnabled: boolean;
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
  const select = { id: true, name: true, slug: true, type: true, logoUrl: true, primaryColor: true, instagramImportEnabled: true };
  const toJoinTenant = (clinic: {
    id: string;
    name: string;
    slug: string;
    type: string;
    logoUrl: string | null;
    primaryColor: string | null;
    instagramImportEnabled: boolean;
  }): JoinTenant => ({
    clinicId: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    type: clinic.type,
    logoUrl: clinic.logoUrl && /^https?:\/\//.test(clinic.logoUrl) ? clinic.logoUrl : null,
    primaryColor: clinic.primaryColor,
    instagramImportEnabled: clinic.instagramImportEnabled,
  });

  if (slug) {
    const clinic = await prisma.clinic.findFirst({ where: { slug, isActive: true }, select });
    return clinic ? toJoinTenant(clinic) : null;
  }
  const defaultId = await getDefaultClinicId();
  if (!defaultId) return null;
  const clinic = await prisma.clinic.findUnique({ where: { id: defaultId }, select });
  return clinic ? toJoinTenant(clinic) : null;
}
