import { ADHERENCE_CONFIG } from "@/lib/adherence-config";
import { loadRule } from "./rules";

/**
 * How many days without activity count as falling behind, for one clinic.
 *
 * There were two answers to this question and they could disagree: activity
 * 071 put it in `lib/adherence-config.ts` for the staff card, and activity 072
 * put it in an `AutomationRule` the clinic can edit. The same patient could be
 * "behind" on one screen and fine on the other.
 *
 * The rule wins, because it is the one a clinic can change without a deploy.
 * The constant stays as the default the rule is seeded from and the fallback
 * for a clinic with no rule at all — a threshold that was never chosen is
 * better than no answer.
 */
export const FALLING_BEHIND_RULE = "ADHERENCE_FALLING_BEHIND";

export async function getFallingBehindThreshold(clinicId: string): Promise<number> {
  const rule = await loadRule(FALLING_BEHIND_RULE, clinicId).catch(() => null);
  if (!rule || !rule.active) return ADHERENCE_CONFIG.fallingBehindThresholdDays;

  const condition = rule.condition as Record<string, unknown> | null;
  const expr = condition?.daysWithoutActivity as Record<string, unknown> | undefined;
  const bound = expr?.gte ?? expr?.gt;
  if (typeof bound !== "number") return ADHERENCE_CONFIG.fallingBehindThresholdDays;

  return expr?.gt === bound ? bound + 1 : bound;
}
