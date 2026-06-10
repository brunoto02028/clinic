import { apiFetch } from "./client";
import type { AuthUser } from "./types";

/** Fetches the authenticated patient's profile (bearer-protected). */
export function fetchMe(): Promise<{ user: AuthUser }> {
  return apiFetch<{ user: AuthUser }>("/api/mobile/me");
}
