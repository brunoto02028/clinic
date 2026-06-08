import { apiFetch } from "./client";

export interface BPReading {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  notes: string | null;
  measuredAt: string;
}

export async function fetchBPReadings(): Promise<BPReading[]> {
  const res = await apiFetch<{ readings: BPReading[] }>("/api/patient/blood-pressure");
  return res.readings ?? [];
}

export async function createBPReading(input: {
  systolic: number;
  diastolic: number;
  heartRate?: number;
}): Promise<void> {
  await apiFetch("/api/patient/blood-pressure", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
