import crypto from "crypto";

/**
 * Generate a stable, non-reversible pseudonym for a patient.
 * Format: P-XXXXXXXX (8 hex chars from SHA-256 of patientId + salt).
 * The salt ensures the pseudonym cannot be reversed to the original ID
 * without knowing the salt value.
 */
const PSEUDONYM_SALT = process.env.PSEUDONYM_SALT || "bpr-clinic-v1";

export function patientPseudonym(patientId: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(patientId + PSEUDONYM_SALT)
    .digest("hex")
    .substring(0, 8)
    .toUpperCase();
  return `P-${hash}`;
}

/**
 * Convert a date of birth to an age band (e.g. "35-44").
 * Returns null if dateOfBirth is null/invalid.
 */
export function ageBand(dateOfBirth: Date | string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  if (age < 0 || age > 120) return null;
  const lower = Math.floor(age / 10) * 10;
  const upper = lower + 9;
  return `${lower}-${upper}`;
}

/**
 * Convert an exact age number to an age band (e.g. 37 -> "30-39").
 */
export function ageBandFromNumber(age: number | null): string | null {
  if (age == null || age < 0 || age > 120) return null;
  const lower = Math.floor(age / 10) * 10;
  const upper = lower + 9;
  return `${lower}-${upper}`;
}
