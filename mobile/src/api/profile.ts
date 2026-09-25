import { apiFetch } from "./client";

export interface PatientProfile {
  profileImageUrl?: string | null;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  preferredLocale?: string | null;
  communicationPreference?: string | null;
  /** Aviso no celular. O paciente desliga aqui em vez de desinstalar. */
  pushEnabled?: boolean;
}

export async function fetchProfile(): Promise<PatientProfile> {
  const res = await apiFetch<{ user: PatientProfile }>("/api/patient/profile");
  return res.user;
}

export async function updateProfile(patch: Partial<Omit<PatientProfile, "id" | "email">>): Promise<PatientProfile> {
  const res = await apiFetch<{ success: boolean; user: PatientProfile }>(
    "/api/patient/profile",
    { method: "PATCH", body: JSON.stringify(patch) }
  );
  return res.user;
}
