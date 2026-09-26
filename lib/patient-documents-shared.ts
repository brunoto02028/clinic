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

/**
 * Os tipos de áudio da mensagem de voz (089).
 *
 * Uma voz é um anexo de conversa como outro qualquer — ela viaja pelo caminho
 * que já existe, com a autenticação que já existe. O que faltava era esta
 * lista: a validação aceitava imagem, PDF, Word, TXT e CSV, e **recusava
 * áudio**.
 *
 * A lista é explícita, e não `audio/*`, porque `audio/*` deixaria entrar
 * qualquer coisa que se declare áudio. Estes quatro são o que um iPhone e um
 * Android gravam.
 */
export const AUDIO_ALLOWED_TYPES = [
  "audio/m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
];

/**
 * Dois minutos de voz cabem em muito menos que isto; o teto existe para o caso
 * de alguém mandar um arquivo grande pela mesma porta, não para a gravação.
 */
export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

export function ehAudio(type: string): boolean {
  return AUDIO_ALLOWED_TYPES.includes(type);
}

export function validatePatientFile(file: { type: string; size: number }): string | null {
  const audio = ehAudio(file.type);
  if (!audio && !file.type.startsWith("image/") && !DOCUMENT_ALLOWED_TYPES.includes(file.type)) {
    return "Invalid file type. Allowed: images, PDF, Word, TXT, CSV, voice message";
  }
  // O áudio tem teto próprio, menor: é voz, não arquivo.
  const teto = audio ? AUDIO_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (file.size > teto) {
    return audio ? "Voice message too large (max 10MB)" : "File too large (max 25MB)";
  }
  return null;
}
