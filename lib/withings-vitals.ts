/**
 * The Withings measurements beyond blood pressure (activity 074, T-8).
 *
 * The commercial plan sells three tiers, and what separates the £79 one is
 * exactly this list: SpO2, HRV, temperature, intraday heart rate, ECG. The
 * plan's checklist marks it done; it was not. Activity 070 brought blood
 * pressure, sleep and activity, and nothing else.
 *
 * SpO2, temperature and heart rate come from `getmeas` — the same call and the
 * same value/unit shape as blood pressure, which is already proven in
 * production. ECG comes from `v2/heart`, which this code has never seen a real
 * response from: it is read defensively and the whole payload is kept, so the
 * day a real account is connected the mapping can be corrected against
 * something real instead of against my guess.
 *
 * Nothing here invents a number. A metric the account does not have comes back
 * absent, not zero — a wearable screen showing "SpO2 0%" would be a
 * measurement that never happened.
 */

import { withingsRawCall } from "@/lib/withings";

/** Withings measure types, from their `getmeas` documentation. */
export const MEASTYPE = {
  HEART_RATE: 11,
  SPO2: 54,
  BODY_TEMPERATURE: 71,
  SKIN_TEMPERATURE: 73,
} as const;

export interface WithingsVital {
  measuredAt: Date;
  /** Withings' `grpid`, or null when they did not send one. */
  measureId: string | null;
  heartRate?: number;
  spo2?: number;
  bodyTemperature?: number;
  skinTemperature?: number;
}

/**
 * One entry per measure group, with only the values that group actually
 * carried. A group is skipped when it carried none of them.
 */
export async function withingsVitals(
  accessToken: string,
  since: Date,
  until?: Date
): Promise<WithingsVital[]> {
  const body = await withingsRawCall("/measure", {
    action: "getmeas",
    access_token: accessToken,
    meastypes: Object.values(MEASTYPE).join(","),
    category: "1", // real measurements, not user objectives
    startdate: String(Math.floor(since.getTime() / 1000)),
    enddate: String(Math.floor((until ?? new Date()).getTime() / 1000)),
  });

  const out: WithingsVital[] = [];
  for (const group of body?.measuregrps ?? []) {
    const val = (type: number): number | undefined => {
      const m = (group.measures ?? []).find((x: any) => x.type === type);
      if (!m) return undefined;
      const n = m.value * Math.pow(10, m.unit);
      return Number.isFinite(n) ? n : undefined;
    };

    const vital: WithingsVital = {
      measuredAt: new Date(Number(group.date) * 1000),
      measureId: group.grpid != null ? String(group.grpid) : null,
      heartRate: val(MEASTYPE.HEART_RATE),
      spo2: val(MEASTYPE.SPO2),
      bodyTemperature: val(MEASTYPE.BODY_TEMPERATURE),
      skinTemperature: val(MEASTYPE.SKIN_TEMPERATURE),
    };

    const hasSomething =
      vital.heartRate !== undefined ||
      vital.spo2 !== undefined ||
      vital.bodyTemperature !== undefined ||
      vital.skinTemperature !== undefined;
    if (hasSomething) out.push(vital);
  }
  return out;
}

export interface WithingsEcgRecord {
  recordedAt: Date;
  /** Their classification, untouched. We do not interpret a trace. */
  afibClassification: string | number | null;
  heartRate: number | null;
  signalId: string | null;
  /** The whole entry, because the mapping above is not verified yet. */
  raw: unknown;
}

/**
 * ECG recordings, as a fact that one happened and what the device concluded.
 *
 * Never the trace itself, and never our own reading of it: a physiotherapy
 * product that interprets an ECG is a different, regulated product (the
 * commercial plan is explicit about the MHRA line).
 *
 * Returns an empty list when the account has no ECG capability or the scope
 * does not cover it — absence is not an error here.
 */
export async function withingsEcg(
  accessToken: string,
  since: Date,
  until?: Date
): Promise<WithingsEcgRecord[]> {
  let body: any;
  try {
    body = await withingsRawCall("/v2/heart", {
      action: "list",
      access_token: accessToken,
      startdate: String(Math.floor(since.getTime() / 1000)),
      enddate: String(Math.floor((until ?? new Date()).getTime() / 1000)),
    });
  } catch (e: any) {
    // A device without ECG, or a scope that does not include it, answers with
    // an error. That is not a sync failure — the rest of the data is fine.
    console.log("[withings-vitals] no ECG available:", e?.message);
    return [];
  }

  const series = body?.series ?? [];
  return series.map((s: any) => ({
    recordedAt: new Date(Number(s?.timestamp ?? s?.date ?? 0) * 1000),
    afibClassification: s?.ecg?.afib ?? s?.afib ?? null,
    heartRate: typeof s?.heart_rate === "number" ? s.heart_rate : null,
    signalId: s?.ecg?.signalid != null ? String(s.ecg.signalid) : null,
    raw: s,
  }));
}

/** The daily shape the wearable screens read, built from a day's groups. */
export interface VitalsDay {
  dataDate: string;
  spo2?: number;
  bodyTemperature?: number;
  /** Wrist/skin temperature, which is not body temperature and never replaces it. */
  skinTemperature?: number;
  restingHr?: number;
  /**
   * How many measurements contributed a value the day actually uses.
   *
   * QA caught this counting groups that carried nothing but a skin
   * temperature, which was then discarded — the row said "from three
   * measurements" when two of them contributed nothing to it.
   */
  samples: number;
}

/**
 * One row per day, because `WearableDataPoint` is keyed by day and that is
 * what the screens draw.
 *
 * The daily value is the average of that day's measurements, and `samples`
 * says how many — a single reading and twenty readings are not the same claim,
 * and the screen should be able to tell them apart. Resting heart rate is the
 * day's **minimum**, not its mean: the mean of a day's heart rates is not a
 * resting rate by any definition.
 */
export function vitalsByDay(vitals: WithingsVital[]): VitalsDay[] {
  const days = new Map<string, WithingsVital[]>();
  for (const v of vitals) {
    const key = v.measuredAt.toISOString().split("T")[0];
    const list = days.get(key);
    if (list) list.push(v);
    else days.set(key, [v]);
  }

  const mean = (values: number[]) =>
    values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;

  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dataDate, list]) => {
      const spo2 = mean(list.map((v) => v.spo2).filter((n): n is number => n !== undefined));
      const temps = list.map((v) => v.bodyTemperature).filter((n): n is number => n !== undefined);
      const skin = list.map((v) => v.skinTemperature).filter((n): n is number => n !== undefined);
      const hrs = list.map((v) => v.heartRate).filter((n): n is number => n !== undefined);
      const contributed = list.filter(
        (v) =>
          v.spo2 !== undefined ||
          v.bodyTemperature !== undefined ||
          v.skinTemperature !== undefined ||
          v.heartRate !== undefined
      ).length;
      return {
        dataDate,
        spo2: spo2 !== undefined ? Math.round(spo2 * 10) / 10 : undefined,
        bodyTemperature: temps.length ? Math.round((mean(temps) as number) * 10) / 10 : undefined,
        skinTemperature: skin.length ? Math.round((mean(skin) as number) * 10) / 10 : undefined,
        restingHr: hrs.length ? Math.min(...hrs) : undefined,
        samples: contributed,
      };
    });
}
