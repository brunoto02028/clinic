// Client-safe half of lib/patient-documents.ts — just the validation rule,
// no `prisma` import, so the patient documents page (a client component)
// can check a file BEFORE uploading it instead of only finding out it's
// too big after the whole thing has already gone over the wire. Bundling
// lib/patient-documents.ts itself into client code would pull in Prisma.

export const DOCUMENT_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export function validatePatientFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/") && !DOCUMENT_ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: images, PDF, Word, TXT, CSV";
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return "File too large (max 25MB)";
  }
  return null;
}
