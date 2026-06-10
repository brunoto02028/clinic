import { API_URL } from "./config";
import type { AuthResponse, AuthTokens } from "./types";

export class AuthError extends Error {}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuthError(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function loginRequest(email: string, password: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/mobile/login", { email, password });
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
