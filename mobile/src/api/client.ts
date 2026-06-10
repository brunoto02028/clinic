import { API_URL } from "./config";
import { refreshRequest } from "./auth";
import { tokenStorage } from "@/lib/secure-storage";
import type { AuthUser } from "./types";

/**
 * Authenticated API client. Injects the bearer token and, on a 401, performs a
 * single transparent refresh then retries once.
 *
 * The refresh is centralized behind ONE shared promise (`refreshSession`) used by
 * both this client and the auth store's bootstrap/logout. This is critical: the
 * backend rotates refresh tokens and revokes the whole family on reuse, so two
 * concurrent refreshes of the same token would log the user out. A single lock
 * guarantees one rotation at a time.
 */

export interface RefreshOutcome {
  ok: boolean;
  user?: AuthUser;
}

let refreshPromise: Promise<RefreshOutcome> | null = null;
let onAuthFailure: (() => void) | null = null;

/** Registered by the auth store to react to an unrecoverable session loss. */
export function setOnAuthFailure(handler: () => void): void {
  onAuthFailure = handler;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const current = await tokenStorage.getRefresh();
  if (!current) return { ok: false };
  try {
    const res = await refreshRequest(current);
    await tokenStorage.save(res.accessToken, res.refreshToken);
    return { ok: true, user: res.user };
  } catch {
    return { ok: false };
  }
}

/** Single shared refresh. Concurrent callers await the same rotation. */
export function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** The in-flight refresh, if any — lets logout wait for a rotation to settle. */
export function pendingRefresh(): Promise<RefreshOutcome> | null {
  return refreshPromise;
}

async function failSession(): Promise<never> {
  await tokenStorage.clear();
  onAuthFailure?.();
  throw new ApiError(401, "Session expired");
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const send = async (): Promise<Response> => {
    const access = await tokenStorage.getAccess();
    const headers = new Headers(options.headers);
    if (access) headers.set("Authorization", `Bearer ${access}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  let res = await send();

  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed.ok) await failSession();
    res = await send(); // retry once with the new token
    if (res.status === 401) await failSession(); // retry still unauthorized → give up
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as any)?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
