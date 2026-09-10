// The tenant's kind (Clinic.type), and what it switches on. A clinic keeps the
// clinical vocabulary and flow; a personal-trainer studio gets student/workout
// vocabulary and its own modules. Read from the session (clinicType) or a
// Clinic row.
export type TenantTypeValue = "CLINIC" | "PERSONAL_TRAINER";

export function isPersonalTenant(type: string | null | undefined): boolean {
  return type === "PERSONAL_TRAINER";
}
