import { API_URL } from "./config";
import type { AuthResponse, AuthTokens } from "./types";

export class AuthError extends Error {
  /**
   * The HTTP status, because the sign-up screen has to tell four refusals
   * apart and act differently on each: 409 the account already exists (offer
   * to sign in or set a password), 404 the professional code is not one of
   * ours, 403 the clinic is at its patient limit, 503 no clinic could be
   * resolved. One sentence for all four would be a dead end in the first
   * case, which is the one a real patient meets.
   */
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/mobile/login", { email, password });
}

/**
 * Asks for a reset link — the same route the website's own form posts to.
 *
 * The server answers the same sentence whether or not the account exists, on
 * purpose: otherwise this screen would tell a stranger who is a patient here.
 * The screen repeats that answer as it comes, and never says "we sent it".
 */
export function forgotPasswordRequest(email: string): Promise<{ message?: string }> {
  return postJson<{ message?: string }>("/api/auth/forgot-password", { email });
}

export function registerRequest(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  tenantSlug?: string
): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/mobile/register", {
    firstName,
    lastName,
    email,
    password,
    ...(tenantSlug ? { tenantSlug } : {}),
  });
}

export function refreshRequest(refreshToken: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/mobile/refresh", { refreshToken });
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  // Best-effort; ignore failures so logout always proceeds locally.
  try {
    await postJson<{ success: boolean }>("/api/mobile/logout", { refreshToken });
  } catch {
    // no-op
  }
}

export type { AuthResponse, AuthTokens };
