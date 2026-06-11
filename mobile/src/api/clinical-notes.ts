import { apiFetch } from "./client";

export interface ClinicalNote {
  id: string;
  appointmentId?: string;
  treatmentType?: string;
  dateTime?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  therapist?: { firstName: string; lastName: string };
  createdAt: string;
}

export async function fetchClinicalNotes(): Promise<ClinicalNote[]> {
  try {
    const res = await apiFetch<{ notes: ClinicalNote[] }>("/api/patient/clinical-notes");
    return res.notes ?? [];
  } catch {
    return [];
  }
}
