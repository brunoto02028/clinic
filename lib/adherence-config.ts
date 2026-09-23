// Single place to tune the "falling behind" alert (activity 071) — the
// Bruno explicitly asked for this to be easy to change later (e.g. a
// per-clinic override, or a different rule entirely) without hunting
// through multiple files. Every place that needs the threshold reads it
// from here; nothing hardcodes the number itself.
export const ADHERENCE_CONFIG = {
  /** Days with no ExerciseCompletionLog (while something was liberated) before a patient shows up as falling behind. */
  fallingBehindThresholdDays: 3,
};
