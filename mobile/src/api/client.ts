import { API_URL } from "./config";
import { AuthError, refreshRequest } from "./auth";
// Relativo pelo mesmo motivo do `i18n`: o `@/` significa coisas diferentes
// no aplicativo e na web, e o transformador o resolve antes de qualquer
// configuração de teste ver.
import { tokenStorage } from "../lib/secure-storage";
import { tokenEmprestado, renovarEmprestimo } from "../lib/emprestimo";
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
  /**
   * A mesma recusa em português.
   *
   * O servidor manda `error` e `errorPt` em toda recusa que o paciente lê, e
   * este construtor descartava o segundo — então a tela mostrava inglês num
   * aparelho em português, apesar de a frase certa ter chegado pela rede
   * (achado do review da 084, 26/09/2026). Inglês é a língua primária aqui, mas
   * "primária" não é "única".
   */
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public messagePt?: string
  ) {
    super(message);
  }

  /** A frase no idioma do aparelho, com o inglês como reserva. */
  localizada(lang: string): string {
    return lang === "pt" && this.messagePt ? this.messagePt : this.message;
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
  // Upload é escrita, e a área do responsável é de leitura (091 T-7). Antes
  // eu deixava o anexo passar com o token emprestado, argumentando que o vídeo
  // era da criança — mas isso é uma escrita no prontuário dela vinda de uma
  // sessão que não é dela, e liberá-la é decisão a tomar de propósito.
  recusaSeEscritaEmprestada(method, path);

  const send = async (): Promise<Response> => {
    const access = tokenEmprestado() ?? (await tokenStorage.getAccess());
    const headers = new Headers();
    if (access) headers.set("Authorization", `Bearer ${access}`);
    return fetch(`${API_URL}${path}`, { method, headers, body: form });
  };

  let res = await send();
  if (res.status === 401) {
    const renovou = tokenEmprestado() ? await renovarEmprestimo() : false;
    if (!renovou) {
      const refreshed = await refreshSession();
      if (!refreshed.ok) await failSession();
    }
    res = await send();
    if (res.status === 401) await failSession();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as any)?.error || `Request failed (${res.status})`,
      (data as any)?.code,
      (data as any)?.errorPt
    );
  }
  return data as T;
}

/**
 * A área do responsável é de leitura, e é **aqui** que isso é verdade (091 T-7).
 *
 * Eu havia afirmado que reusar `isImpersonating` no servidor já fechava as
 * escritas. O review de segurança de 27/09/2026 mostrou que não: doze rotas
 * conferem, cerca de trinta não. A afirmação estava errada, e o poder de
 * escrever apareceu de graça junto com a sessão emprestada — exatamente o que
 * os comentários dizem evitar.
 *
 * Esta porta fecha isso do lado do app, por construção: enquanto há token
 * emprestado, só passa leitura. O servidor continua recusando por conta
 * própria o que é grave — comprar exame, trocar credencial, gerir pessoas —,
 * e a auditoria rota a rota fica para ser feita de propósito, não às pressas.
 */
function recusaSeEscritaEmprestada(method: string | undefined, path?: string): void {
  if (!tokenEmprestado()) return;
  /**
   * Entrar na consulta por video e a excecao (089, review de 27/09/2026).
   *
   * Sem ela, uma mae nao consegue entrar na consulta da filha — e a filha nao
   * tem credencial propria, porque o login recusa quem tem `managedById`. A
   * consulta a distancia de menor simplesmente nao acontecia.
   *
   * O servidor tem a mesma excecao, em `lib/sessao-emprestada.ts`, e e la que
   * ela vale. Esta aqui existe so para o toque nao morrer no aparelho.
   */
  if (path && /^\/api\/appointments\/[^/]+\/video$/.test(path)) return;
  const verbo = (method ?? "GET").toUpperCase();
  if (verbo === "GET" || verbo === "HEAD" || verbo === "OPTIONS") return;
  throw new ApiError(
    403,
    "Switch back to your own account to make changes.",
    "on_behalf_read_only",
    "Volte para a sua conta para fazer alterações."
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  recusaSeEscritaEmprestada(options.method);

  const send = async (): Promise<Response> => {
    // O token emprestado ganha do próprio, quando existe (091 T-7): enquanto o
    // responsável está vendo como a criança, **toda** chamada é sobre ela, e é
    // isso que faz as dezenas de telas clínicas funcionarem sem mudar.
    const access = tokenEmprestado() ?? (await tokenStorage.getAccess());
    const headers = new Headers(options.headers);
    if (access) headers.set("Authorization", `Bearer ${access}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_URL}${path}`, { ...options, headers });
  };

  let res = await send();

  if (res.status === 401) {
    // Empréstimo vencido é outra coisa de sessão vencida. Renovar o empréstimo
    // **não** pode passar pelo `refreshSession`, que renovaria a sessão do
    // responsável e devolveria um token dele — e aí a tela da filha passaria a
    // mostrar os dados da mãe, em silêncio, que é o pior desfecho possível.
    const renovou = tokenEmprestado() ? await renovarEmprestimo() : false;
    if (!renovou) {
      const refreshed = await refreshSession();
      if (!refreshed.ok) await failSession();
    }
    res = await send(); // retry once with the new token
    if (res.status === 401) await failSession(); // retry still unauthorized → give up
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as any)?.error || `Request failed (${res.status})`,
      (data as any)?.code,
      (data as any)?.errorPt
    );
  }
  return data as T;
}
