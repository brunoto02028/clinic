import { apiFetch } from "./client";

export interface BodyAssessment {
  id: string;
  assessmentNumber?: number;
  status: string;
  sentToPatientAt: string;
  therapist: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export async function fetchBodyAssessments(): Promise<BodyAssessment[]> {
  try {
    const res = await apiFetch<BodyAssessment[]>("/api/patient/body-assessments");
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}
