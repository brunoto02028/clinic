import { prisma } from "@/lib/db";
import { getDefaultClinicId } from "@/lib/default-tenant";

const HARDCODED_FALLBACK = "brunotoaz@gmail.com";

// Short TTL cache — this is looked up on every outbound patient email (the
// auto-BCC in sendTemplatedEmail), not just the once-in-a-while admin
// alerts, so a naive per-call DB round-trip adds up under any send burst.
// Same pattern as lib/turnstile.ts's secret cache: a value that rarely
// changes doesn't need to be read fresh on every single send.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { value: string; at: number }>();

function cacheKey(clinicId?: string | null): string {
  return clinicId || "__global__";
}

/**
 * Resolves where operational admin alerts (new signup, high blood pressure,
 * patient-initiated cancellation, etc.) should be sent — activity 37.
 *
 * `SiteSettings` is, in practice, a single global row (clinicId: null) that
 * only the default/primary tenant's admin UI (/admin/settings) edits — real
 * multi-tenant onboarding (POST /api/admin/clinics) never creates a
 * per-clinic SiteSettings row. Naively falling through to that global row
 * for ANY clinicId would leak a non-default tenant's alerts (e.g. a
 * personal-trainer studio's patient signup) into the default clinic's
 * inbox — caught in code review before this shipped. So a clinicId that
 * ISN'T the default tenant never reads the global SiteSettings row; it
 * only trusts its own `Clinic.notificationEmail`/`Clinic.email`, or the
 * generic fallback — never someone else's configured inbox.
 *
 * Order for a given clinicId:
 *   1. Clinic.notificationEmail (explicit per-tenant override)
 *   2. If this clinicId IS the default tenant: SiteSettings.notificationEmail → SiteSettings.email
 *   3. Clinic.email (that tenant's own public contact address, better than a stranger's inbox)
 *   4. ADMIN_EMAIL env var → hardcoded last resort
 * With no clinicId at all (ops-only alerts with no tenant context, e.g. the
 * AI co-worker or the Vapi webhook): SiteSettings cascade → ADMIN_EMAIL → hardcoded.
 */
export async function getAdminNotificationEmail(clinicId?: string | null): Promise<string> {
  const key = cacheKey(clinicId);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const resolved = await resolve(clinicId);
  cache.set(key, { value: resolved, at: Date.now() });
  return resolved;
}

async function resolve(clinicId?: string | null): Promise<string> {
  try {
    if (clinicId) {
      const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { notificationEmail: true, email: true } });
      if (clinic?.notificationEmail) return clinic.notificationEmail;

      const defaultClinicId = await getDefaultClinicId();
      if (defaultClinicId && clinicId === defaultClinicId) {
        const settings = await prisma.siteSettings.findFirst({ select: { notificationEmail: true, email: true } });
        if (settings?.notificationEmail) return settings.notificationEmail;
        if (settings?.email) return settings.email;
      }

      if (clinic?.email) return clinic.email;
    } else {
      const settings = await prisma.siteSettings.findFirst({ select: { notificationEmail: true, email: true } });
      if (settings?.notificationEmail) return settings.notificationEmail;
      if (settings?.email) return settings.email;
    }
  } catch (err) {
    console.error("[admin-notify-email] Lookup failed — falling back:", err);
  }
  return process.env.ADMIN_EMAIL || HARDCODED_FALLBACK;
}

/** Escapes a string for safe interpolation into HTML email bodies — every
 * admin alert embeds patient-controlled input (name, notes, etc.), some of
 * it (signup) reachable with no authentication at all. */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
