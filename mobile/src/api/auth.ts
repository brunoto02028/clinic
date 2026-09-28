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
  constructor(
    message: string,
    public status?: number,
    /**
     * O corpo inteiro da recusa (097 T-2).
     *
     * O 409 do login social traz `code: "account_exists"` e `hasPassword`, e
     * a tela precisa dos dois: sem senha, "entre com a sua senha" é um beco
     * sem saída — a conta nasceu pela clínica e nunca teve uma.
     */
    public data?: Record<string, any>
  ) {
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
    throw new AuthError(data?.error || `Request failed (${res.status})`, res.status, data);
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

/**
 * Entrar com Google e com Apple (097 T-3/T-4).
 *
 * Devolvem **o mesmo** `AuthResponse` que `/api/mobile/login` devolve — de
 * propósito. Um formato próprio por provedor daria ao app três jeitos de estar
 * logado, e dois deles envelheceriam sozinhos.
 *
 * O 409 (`account_exists`) não é erro de digitação: já existe conta com aquele
 * e-mail e ela não tem o provedor ligado. O e-mail sozinho não prova que é a
 * mesma pessoa, então o servidor pede a senha uma vez antes de ligar os dois.
 */
export function googleSignInRequest(idToken: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/mobile/auth/google", { idToken });
}

export function appleSignInRequest(cred: {
  identityToken: string;
  nonce: string;
  fullName: { givenName: string | null; familyName: string | null } | null;
}): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/mobile/auth/apple", cred);
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
