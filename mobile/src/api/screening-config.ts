import { apiFetch } from "./client";

/**
 * The clinic's screening configuration — the same document the web form reads.
 *
 * The red-flag questions and the consent wording live here, editable per
 * clinic, so the app asks exactly what the web asks instead of carrying its own
 * copy that drifts. `/api/screening-config` is already in the middleware's
 * mobile prefix list, so the bearer request gets its CORS headers.
 */
export interface RedFlagQuestion {
  key: string;
  en: string;
  pt: string;
  enabled?: boolean;
}

export interface ScreeningConfig {
  redFlagQuestions?: RedFlagQuestion[];
  consentText?: { en: string; pt: string };
}

export async function fetchScreeningConfig(): Promise<ScreeningConfig | null> {
  // Deliberately not swallowed into a default: the red-flag questions and the
  // consent wording are not something to guess at. The caller blocks submission
  // when this is missing rather than asking nothing and claiming consent.
  return apiFetch<ScreeningConfig>("/api/screening-config");
}
