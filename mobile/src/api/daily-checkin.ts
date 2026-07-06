import { apiFetch } from "./client";

export interface CheckIn {
  id: string;
  checkinDate: string;
  painLevel: number;
  moodLevel: number;
  energyLevel: number | null;
  sleepQuality: number | null;
  stressLevel: number | null;
  exercisesDone: boolean;
  notes: string | null;
}

export async function submitCheckIn(data: {
  painLevel: number;
  moodLevel: number;
  energyLevel?: number;
  sleepQuality?: number;
  stressLevel?: number;
  exercisesDone: boolean;
  notes?: string;
}) {
  return apiFetch<{ checkIn: CheckIn; xpAwarded?: number }>("/api/patient/daily-checkin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchCheckIns() {
  return apiFetch<{ today: CheckIn | null; history: CheckIn[] }>("/api/patient/daily-checkin");
}
