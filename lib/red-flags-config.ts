import { prisma } from "@/lib/db";
import { RED_FLAG_KEYS, toRedFlagKeys, type RedFlagKey } from "@/lib/red-flags";

/**
 * The red-flag questions the clinic's screening config actually asks.
 *
 * Server-only (reads the DB), which is why it is apart from lib/red-flags.ts —
 * that one is pure and safe to import from client components.
 *
 * Mirrors the two places that decide what a patient is shown, so "complete"
 * means the same thing to the analysis as it does to the form:
 *   - `/api/screening-config` GET reads `siteSettings.screeningConfigJson`
 *     and falls back to its DEFAULT_CONFIG, in which every question is on;
 *   - the web form asks `redFlagQuestions.filter(q => q.enabled)`, and skips
 *     the whole step when the `red_flags` section is disabled.
 *
 * Fails toward requiring everything. If the config cannot be read or parsed,
 * all twelve are returned: treating an unknown config as "nothing required"
 * would let an unscreened case read as screened.
 */
export async function getEnabledRedFlagKeys(): Promise<RedFlagKey[]> {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: { screeningConfigJson: true },
    });
    if (!settings?.screeningConfigJson) return [...RED_FLAG_KEYS];

    const cfg = JSON.parse(settings.screeningConfigJson) as {
      sections?: { id: string; enabled?: boolean }[];
      redFlagQuestions?: { key: string; enabled?: boolean }[];
    };

    const section = cfg.sections?.find((s) => s.id === "red_flags");
    if (section && section.enabled === false) return [];

    if (!Array.isArray(cfg.redFlagQuestions)) return [...RED_FLAG_KEYS];
    return toRedFlagKeys(
      cfg.redFlagQuestions.filter((q) => q.enabled !== false).map((q) => q.key)
    );
  } catch {
    return [...RED_FLAG_KEYS];
  }
}
