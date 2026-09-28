import { apiFetch } from "./client";

/**
 * Ligar o Google ou a Apple a uma conta que já existe (097 T-2).
 *
 * Mora fora de `api/auth.ts` por causa do sentido das setas: `client.ts`
 * importa `auth.ts` para conseguir renovar a sessão, então `auth.ts` não pode
 * importar `client.ts` de volta. E estas chamadas **precisam** do bearer — é
 * a sessão que acabou de nascer da senha que autoriza o vínculo.
 */

type Vinculo = { linked: boolean; alreadyLinked?: boolean };

export interface ProvedoresLigados {
  google: boolean;
  apple: boolean;
  /** Sem senha, desligar o último provedor tranca a pessoa fora da conta. */
  hasPassword: boolean;
  /** O servidor está configurado para este provedor? Sem client ID, oferecer
   *  "conectar" é oferecer um botão que só pode falhar. */
  googleAvailable: boolean;
  appleAvailable: boolean;
}

export function provedoresLigados(): Promise<ProvedoresLigados> {
  return apiFetch<ProvedoresLigados>("/api/mobile/auth/providers");
}

export function desligarProvedor(qual: "google" | "apple"): Promise<Vinculo> {
  return apiFetch<Vinculo>(`/api/mobile/auth/${qual}/link`, { method: "DELETE" });
}

export function ligarGoogle(idToken: string): Promise<Vinculo> {
  return apiFetch<Vinculo>("/api/mobile/auth/google/link", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function ligarApple(cred: {
  identityToken: string;
  nonce: string;
  fullName: { givenName: string | null; familyName: string | null } | null;
}): Promise<Vinculo> {
  return apiFetch<Vinculo>("/api/mobile/auth/apple/link", {
    method: "POST",
    body: JSON.stringify(cred),
  });
}
