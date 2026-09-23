import { apiFetch } from "./client";

export interface OutcomeMeasures {
  vasScore: number;
  faamAdlPercent: number | null;
  faamSportPercent: number | null;
  overallFunction: number;
  faamAdl?: Record<string, any>;
  faamSport?: Record<string, any>;
}

export async function fetchOutcomeMeasures(): Promise<OutcomeMeasures | null> {
  // No catch. Returning null on failure was not merely misleading here, it
  // destroyed data: the screen opened at VAS 0 / 50% with no warning, and the
  // save then posted empty FAAM objects over the patient's real scores. A
  // null must mean "this patient has no measures yet", never "the request
  // failed" — the caller has to be able to tell those apart before writing.
  const res = await apiFetch<{ measures: OutcomeMeasures | null }>("/api/patient/outcome-measures");
  return res.measures ?? null;
}

export async function saveOutcomeMeasures(data: OutcomeMeasures): Promise<OutcomeMeasures> {
  const res = await apiFetch<{ measures: OutcomeMeasures }>("/api/patient/outcome-measures", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.measures;
}
