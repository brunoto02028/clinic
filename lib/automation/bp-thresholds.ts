import { prisma } from "@/lib/db";
import {
  BP_THRESHOLD_RULE,
  BP_DEFAULTS,
  bandsAreSane,
  thresholdsFromCondition,
  type BpThresholds,
} from "./bp-bands";

/**
 * Reading the clinic's thresholds out of the database.
 *
 * The bands themselves — the numbers, the limits, the classification — are in
 * `bp-bands.ts`, which the admin screen also imports. This file is the half
 * that touches Prisma. It re-exports the pure half so the routes that already
 * import from here keep one import.
 */
export * from "./bp-bands";

export async function getBpThresholds(clinicId: string | null): Promise<BpThresholds> {
  if (!clinicId) return { ...BP_DEFAULTS };

  try {
    // Both rows, because "the default" is ambiguous and QA of T-3 caught it:
    // a clinic that switches its own override off should fall back to what the
    // platform configured globally, not to a constant in this file. The code
    // default is the last resort, for when there is no global either.
    const [own, global] = await Promise.all([
      // `createdAt asc` mirrors `loadRules`, so a duplicated global row is
      // resolved the same way here as everywhere else in the engine.
      prisma.automationRule.findFirst({
        where: { code: BP_THRESHOLD_RULE, clinicId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.automationRule.findFirst({
        where: { code: BP_THRESHOLD_RULE, clinicId: null },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // An inactive rule means "use what is behind it". It must never mean
    // "never alert": switching a rule off is an everyday admin action, and on
    // this path the consequence of getting it wrong is a missed crisis.
    for (const rule of [own, global]) {
      if (!rule || !rule.active) continue;
      const merged = thresholdsFromCondition(rule.condition);
      if (bandsAreSane(merged)) return merged;
    }

    return { ...BP_DEFAULTS };
  } catch (e) {
    // The rule is configuration, not the source of truth. A database hiccup
    // here must not stop a reading from being classified at all.
    console.error("[bp-thresholds] falling back to defaults:", e);
    return { ...BP_DEFAULTS };
  }
}
