import { apiFetch } from "./client";

export interface AssessmentStep {
  id: string;
  label: string;
  labelPt: string;
  status: "pending" | "in_progress" | "completed" | "processing" | "partial";
  data: any;
}

export interface AssessmentProgress {
  steps: AssessmentStep[];
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  nextStep: string | null;
}

export async function fetchAssessmentProgress(): Promise<AssessmentProgress | null> {
  try {
    return await apiFetch<AssessmentProgress>("/api/patient/assessment-progress");
  } catch {
    return null;
  }
}
