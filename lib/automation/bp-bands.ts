/**
 * The blood-pressure bands, with no database in them.
 *
 * Same numbers as `bp-thresholds.ts`, split off because `/admin/automation`
 * renders in the browser and needs to read a rule's four numbers to preview it.
 * Importing the module that imports Prisma would have pulled the client into
 * the browser bundle — the same mistake that took `/dashboard/biohacking` from
 * 9.88 kB to 142 kB earlier in this activity.
 *
 * Where the numbers come from: two pairs written into
 * `app/api/patient/blood-pressure` — 130/80 to alert the clinic, 180/120 to
 * call it a crisis. Those are the
 * ACC/AHA bands and a fine default, but a clinic treating athletes and a clinic
 * treating hypertensive patients do not want the same trigger, and changing it
 * meant a deploy.
 *
 * Same shape as the rest of the engine (activity 072): the rule in the database
 * wins, the constants here are the seed and the fallback. A clinic's own row
 * beats the global one, and a rule switched off means "use the default", not
 * "alert on nothing" — silence is never what a missing configuration should buy
 * on a clinical-safety path.
 */
export const BP_THRESHOLD_RULE = "BP_THRESHOLDS";

/** ACC/AHA 2017 bands, which is what the code carried before this existed. */
export const BP_DEFAULTS = {
  alertSystolic: 130,
  alertDiastolic: 80,
  crisisSystolic: 180,
  crisisDiastolic: 120,
} as const;

export interface BpThresholds {
  alertSystolic: number;
  alertDiastolic: number;
  crisisSystolic: number;
  crisisDiastolic: number;
}

/** A number from free-form JSON, or null when it is not a usable one. */
function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The range a threshold may sit in at all.
 *
 * The same limits the blood-pressure route already applies to a *reading*,
 * narrowed to what is plausible as a *trigger*. QA of T-3 configured
 * 500/300–600/400, which passed an ordering check (600 > 500) and then
 * swallowed a real 195/130 crisis in silence: one extra digit in a text box
 * disabled the only clinical safety net in the product, permanently and with
 * no sign that anything had happened.
 */
export const BP_LIMITS = {
  systolic: { min: 90, max: 220 },
  diastolic: { min: 50, max: 140 },
} as const;

/**
 * Why a configuration is unusable, in both languages.
 *
 * Both, because the refusal has to be readable where it is shown: QA of T-3
 * found an English sentence on a panel that was otherwise entirely in
 * Portuguese. Translating it at the screen would mean matching on the text of
 * an error message, which breaks the day someone rewords it.
 */
export interface ThresholdProblem {
  en: string;
  pt: string;
}

export function bpThresholdProblem(t: BpThresholds): ThresholdProblem | null {
  const within = (v: number, l: { min: number; max: number }) => v >= l.min && v <= l.max;
  if (!within(t.alertSystolic, BP_LIMITS.systolic) || !within(t.crisisSystolic, BP_LIMITS.systolic)) {
    return {
      en: `Systolic thresholds must be between ${BP_LIMITS.systolic.min} and ${BP_LIMITS.systolic.max} mmHg`,
      pt: `Os limiares de sistólica têm de ficar entre ${BP_LIMITS.systolic.min} e ${BP_LIMITS.systolic.max} mmHg`,
    };
  }
  if (!within(t.alertDiastolic, BP_LIMITS.diastolic) || !within(t.crisisDiastolic, BP_LIMITS.diastolic)) {
    return {
      en: `Diastolic thresholds must be between ${BP_LIMITS.diastolic.min} and ${BP_LIMITS.diastolic.max} mmHg`,
      pt: `Os limiares de diastólica têm de ficar entre ${BP_LIMITS.diastolic.min} e ${BP_LIMITS.diastolic.max} mmHg`,
    };
  }
  // A crisis at or below the alert is not a stricter setting — it is one where
  // every alert is also a crisis, so the patient is paged for a stage-1 reading.
  if (t.crisisSystolic <= t.alertSystolic || t.crisisDiastolic <= t.alertDiastolic) {
    return {
      en: "The crisis threshold must be higher than the alert threshold, on both numbers",
      pt: "O limiar de crise tem de ser maior que o de alerta, nos dois números",
    };
  }
  return null;
}

export function bandsAreSane(t: BpThresholds): boolean {
  return bpThresholdProblem(t) === null;
}

/** Reads the four numbers out of a rule's free-form condition. */
export function thresholdsFromCondition(condition: unknown): BpThresholds {
  const data = (condition ?? {}) as Record<string, unknown>;
  return {
    alertSystolic: num(data.alertSystolic) ?? BP_DEFAULTS.alertSystolic,
    alertDiastolic: num(data.alertDiastolic) ?? BP_DEFAULTS.alertDiastolic,
    crisisSystolic: num(data.crisisSystolic) ?? BP_DEFAULTS.crisisSystolic,
    crisisDiastolic: num(data.crisisDiastolic) ?? BP_DEFAULTS.crisisDiastolic,
  };
}

/** Which band a reading falls in, on the thresholds this clinic uses. */
export function classify(
  systolic: number,
  diastolic: number,
  t: BpThresholds
): { isCrisis: boolean; isAlert: boolean; classification: string } {
  const isCrisis = systolic >= t.crisisSystolic || diastolic >= t.crisisDiastolic;
  const isAlert = systolic >= t.alertSystolic || diastolic >= t.alertDiastolic;
  // Stage 2 sat at a hardcoded 140/90 while the alert band moved with the
  // rule, so a clinic that lowered its alert to 110/70 had 115/75 reaching the
  // therapist labelled "Stage 1 Hypertension" — a name, not a measurement, and
  // a false one. It now sits halfway between this clinic's own two bands.
  const stage2Systolic = Math.round((t.alertSystolic + t.crisisSystolic) / 2);
  const stage2Diastolic = Math.round((t.alertDiastolic + t.crisisDiastolic) / 2);
  const isStage2 = systolic >= stage2Systolic || diastolic >= stage2Diastolic;
  return {
    isCrisis,
    isAlert,
    // A reading below this clinic's own alert threshold is not hypertension of
    // any stage. The ternary had no such branch, so a clinic with its alert at
    // 160/100 got e-mails calling 145/95 "Stage 1 Hypertension" — a diagnosis,
    // in a product that must not make one, about a reading that clinic does
    // not consider high.
    classification: isCrisis
      ? "Hypertensive Crisis"
      : !isAlert
        ? systolic < 120 && diastolic < 80
          ? "Normal"
          : "Below this clinic's alert threshold"
        : isStage2
          ? "Stage 2 Hypertension"
          : "Stage 1 Hypertension",
  };
}
