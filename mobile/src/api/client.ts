import { API_URL } from "./config";
import { AuthError, refreshRequest } from "./auth";
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
  /**
   * Por que falhou — e a distincao nao e academica.
   *
   * `auth` e sessao morta: token revogado, expirado, conta desativada. O
   * servidor respondeu, e apagar os tokens e o certo.
   *
   * `network` e telefone sem sinal. O `fetch` lanca antes de sair do aparelho,
   * e o `catch` cego tratava os dois como a mesma coisa — entao o paciente num
   * tunel de metro perdia a sessao e caia num login que, sem rede, tambem nao
   * funciona. A tranca promete que "a senha continua sendo a chave"; apaga-la
   * aqui quebrava a promessa.
   */
  reason?: "network" | "auth";
}

let refreshPromise: Promise<RefreshOutcome> | null = null;
let onAuthFailure: (() => void) | null = null;

/** Registered by the auth store to react to an unrecoverable session loss. */
export function setOnAuthFailure(handler: () => void): void {
  onAuthFailure = handler;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const current = await tokenStorage.getRefresh();
  if (!current) return { ok: false, reason: "auth" };
  try {
    const res = await refreshRequest(current);
    await tokenStorage.save(res.accessToken, res.refreshToken);
    return { ok: true, user: res.user };
  } catch (e) {
    // `AuthError` significa que o servidor respondeu — a sessao e que nao
    // serve. Qualquer outra coisa e o `fetch` falhando antes disso.
    return { ok: false, reason: e instanceof AuthError ? "auth" : "network" };
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
  /**
   * The server's machine-readable reason, when it gave one. Two different
   * 403s reach the same screens — "not in your plan" and "you have not
   * accepted the terms" — and only one of them is something the patient can
   * fix. Telling them apart needs more than a status code.
   */
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/**
 * Envio de arquivo com a mesma disciplina do `apiFetch`.
 *
 * O upload não podia sair por um `fetch` solto: o access token vale 15
 * minutos, e quem usasse o app por dezesseis tomava 401 num caminho que não
 * sabe renovar — "não foi possível salvar essa foto", de novo e de novo, até
 * outra tela por acaso renovar a sessão.
 *
 * O `Content-Type` fica por conta do `FormData`: escrevê-lo à mão apaga o
 * `boundary` e o servidor não consegue separar as partes.
 */
export async function apiUpload<T>(
  path: string,
  form: FormData,
  method: "POST" | "PUT" = "POST"
): Promise<T> {
  const send = async (): Promise<Response> => {
    const access = await tokenStorage.getAccess();
    const headers = new Headers();
    if (access) headers.set("Authorization", `Bearer ${access}`);
    return fetch(`${API_URL}${path}`, { method, headers, body: form });
  };

  let res = await send();
  if (res.status === 401) {
    const refreshed = await refreshSession();
    if (!refreshed.ok) await failSession();
    res = await send();
    if (res.status === 401) await failSession();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as any)?.error || `Request failed (${res.status})`,
      (data as any)?.code
    );
  }
  return data as T;
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
    throw new ApiError(
      res.status,
      (data as any)?.error || `Request failed (${res.status})`,
      (data as any)?.code
    );
  }
  return data as T;
}
