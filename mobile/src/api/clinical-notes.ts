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
  // No catch. This used to swallow every failure into an empty list, which is
  // why a 404 on a route that did not exist read as "you have no notes" for as
  // long as it did. An empty list and a broken request must not look alike.
  const res = await apiFetch<{ notes: ClinicalNote[] }>("/api/patient/clinical-notes");
  return res.notes ?? [];
}
