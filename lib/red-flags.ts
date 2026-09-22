/**
 * Red flags are tri-state, and this module is the one place that says so.
 *
 *   true  — the patient said yes
 *   false — the patient said no
 *   null  — the question was NOT ASKED (or not answered)
 *
 * The twelve columns used to be `Boolean @default(false)`, which could not
 * store "not asked". Every unanswered question was therefore recorded as a
 * denial: a patient's first autosave wrote twelve "No" answers to questions
 * nobody had put to them; the app's wizard then showed those as already
 * answered and let the screening be submitted; the admin rendered each as a
 * green check; and the evidence report's urgent red-flag gate saw
 * "none detected" and went on to suggest treatment. (activity 070, T-12)
 *
 * The rule every reader must follow: **null is never "no"**. A truthiness check
 * (`if (s.nightPain)`) is still correct for "did the patient report this?", but
 * nothing may conclude a patient is clear of red flags without first checking
 * that all of them were answered — use `unansweredRedFlags`.
 */

export const RED_FLAG_KEYS = [
  "unexplainedWeightLoss",
  "nightPain",
  "traumaHistory",
  "neurologicalSymptoms",
  "bladderBowelDysfunction",
  "recentInfection",
  "cancerHistory",
  "steroidUse",
  "osteoporosisRisk",
  "cardiovascularSymptoms",
  "severeHeadache",
  "dizzinessBalanceIssues",
] as const;

export type RedFlagKey = (typeof RED_FLAG_KEYS)[number];

/** A screening-like object: any subset of the red-flag fields, as stored. */
export type RedFlagValues = Partial<Record<RedFlagKey, boolean | null | undefined>>;

export type RedFlagAnswer = "yes" | "no" | "unanswered";

/** How a single stored value reads. `undefined` counts as unanswered too. */
export function redFlagAnswer(value: boolean | null | undefined): RedFlagAnswer {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "unanswered";
}

/**
 * The red flags that were asked but never answered. Empty means complete.
 *
 * `enabled` is the set the clinic's screening config actually asks. A clinic
 * can switch individual red-flag questions off (or the whole section), and a
 * question that was never put to the patient because it is disabled is not
 * "missing" — counting it would mark every screening from that clinic
 * incomplete forever and halt its evidence reports for good. Omitted, all
 * twelve are required: when the config is unknown, the safe reading is that
 * every question should have been asked.
 */
export function unansweredRedFlags(
  screening: RedFlagValues | null | undefined,
  enabled: readonly RedFlagKey[] = RED_FLAG_KEYS
): RedFlagKey[] {
  if (!screening) return [...enabled];
  return enabled.filter((k) => typeof screening[k] !== "boolean");
}

/** True only when every asked red flag has a real yes/no. */
export function isRedFlagScreenComplete(
  screening: RedFlagValues | null | undefined,
  enabled: readonly RedFlagKey[] = RED_FLAG_KEYS
): boolean {
  return unansweredRedFlags(screening, enabled).length === 0;
}

/** Narrow an arbitrary key list (e.g. from the config JSON) to known flags. */
export function toRedFlagKeys(keys: readonly string[]): RedFlagKey[] {
  const known = new Set<string>(RED_FLAG_KEYS);
  return keys.filter((k): k is RedFlagKey => known.has(k));
}
