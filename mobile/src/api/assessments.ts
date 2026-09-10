import { apiFetch } from "./client";

export interface AssessmentPhoto {
  id: string;
  pose: string;
  url: string;
}

export interface Assessment {
  id: string;
  performedAt: string;
  assessmentType: string | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  bfMethod: string;
  leanMassKg: number | null;
  fatMassKg: number | null;
  whr: number | null;
  restingHr: number | null;
  systolic: number | null;
  diastolic: number | null;
  girths: Record<string, number> | null;
  notes: string | null;
  photos: AssessmentPhoto[];
}

export function fetchAssessments(): Promise<Assessment[]> {
  return apiFetch<Assessment[]>("/api/mobile/assessments");
}
