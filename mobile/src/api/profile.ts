import { apiFetch } from "./client";

export interface PatientProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  preferredLocale?: string | null;
}

export async function fetchProfile(): Promise<PatientProfile> {
  const res = await apiFetch<{ user: PatientProfile }>("/api/patient/profile");
  return res.user;
}

/** Updates editable profile fields (phone in this phase). */
export async function updateProfile(patch: { phone?: string }): Promise<PatientProfile> {
  const res = await apiFetch<{ success: boolean; user: PatientProfile }>(
    "/api/patient/profile",
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return res.user;
}
