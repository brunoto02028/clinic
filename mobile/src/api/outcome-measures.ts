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
  try {
    const res = await apiFetch<{ measures: OutcomeMeasures | null }>("/api/patient/outcome-measures");
    return res.measures ?? null;
  } catch {
    return null;
  }
}

export async function saveOutcomeMeasures(data: OutcomeMeasures): Promise<OutcomeMeasures> {
  const res = await apiFetch<{ measures: OutcomeMeasures }>("/api/patient/outcome-measures", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.measures;
}
