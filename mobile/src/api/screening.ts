import { apiFetch } from "./client";

export interface ScreeningData {
  id?: string;
  isSubmitted?: boolean;
  occupation?: string;
  dominantSide?: string;
  dominantFootSide?: string;
  activityLevel?: string;
  hobbiesSports?: string;
  height?: string;
  weight?: string;
  chiefComplaint?: string;
  painLocation?: string;
  painDuration?: string;
  painScore?: number;
  painType?: string;
  painAggravating?: string;
  painRelieving?: string;
  functionalLimitations?: string;
  sleepAffected?: boolean;
  workAffected?: boolean;
  mobilityAffected?: boolean;
  previousPhysio?: boolean;
  previousPhysioDetails?: string;
  currentMedications?: string;
  allergies?: string;
  surgicalHistory?: string;
  otherConditions?: string;
  treatmentGoals?: string;
  consentGiven?: boolean;
  [key: string]: any;
}

export async function fetchScreening(): Promise<ScreeningData | null> {
  try {
    const res = await apiFetch<{ screening: ScreeningData }>("/api/medical-screening");
    return res.screening ?? null;
  } catch {
    return null;
  }
}

export async function saveScreening(data: Partial<ScreeningData>, autosave = false): Promise<ScreeningData> {
  const res = await apiFetch<{ screening: ScreeningData }>("/api/medical-screening", {
    method: "POST",
    body: JSON.stringify({ ...data, _autosave: autosave }),
  });
  return res.screening;
}
