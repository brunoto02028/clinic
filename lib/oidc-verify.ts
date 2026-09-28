import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verificar o ID token de um provedor de identidade (097 T-1/T-4).
 *
 * ## Por que a validação mora aqui, e não nas rotas
 *
 * O app **nunca é fonte de identidade**. Ele obtém um ID token e manda para
 * cá; quem decide quem é a pessoa é o servidor. Google e Apple têm chaves
 * diferentes e claims diferentes, mas a verificação é a mesma sequência — e
 * duas cópias dela envelheceriam diferente.
 *
 * ## Por que `jose`, e não `google-auth-library`
 *
 * A spec previa `google-auth-library`. Ela traz dez pacotes (gaxios,
 * gcp-metadata, gtoken…) para fazer uma coisa: verificar a assinatura de um
 * JWT contra as chaves públicas do provedor — e não serve para a Apple, que
 * precisaria de outra. O `jose` já **está instalado** (o `next-auth` depende
 * dele) e serve aos dois.
 *
 * Nada de novo foi baixado: só declarei no `package.json` o que já vinha
 * junto, para o build não depender de um detalhe de hoisting do npm.
 *
 * ## O que é verificado
 *
 * Assinatura, `iss`, `aud` e `exp` — os quatro pela biblioteca — e mais o
 * `nonce`. Um token com `aud` de outro aplicativo é o ataque clássico aqui:
 * qualquer app do mundo pode pedir um ID token ao Google, e só o `aud` diz
 * que aquele token foi emitido **para nós**.
 */

export type MotivoDaRecusa =
  | "nao_configurado"
  | "sem_token"
  | "token_invalido"
  | "email_nao_verificado"
  | "nonce_diferente";

export class IdentidadeRecusada extends Error {
  constructor(
    readonly motivo: MotivoDaRecusa,
    /** A frase que pode ser mostrada a quem tentou entrar. */
    readonly mensagem: string
  ) {
    super(motivo);
    this.name = "IdentidadeRecusada";
  }
}

/** A frase única das recusas de token: a causa real não volta para o cliente
 *  de propósito — "aud errado" e "assinatura inválida" contam a quem está
 *  tentando o que ajustar. */
const NAO_DEU = "Could not verify your sign-in. Please try again.";

/**
 * As chaves públicas de cada provedor, buscadas uma vez e reaproveitadas.
 *
 * `createRemoteJWKSet` respeita o cache-control do provedor e só volta à rede
 * quando aparece um `kid` desconhecido. Criar o conjunto a cada requisição
 * faria um login virar duas chamadas de rede.
 */
const conjuntos = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function chaves(jwksUrl: string) {
  let c = conjuntos.get(jwksUrl);
  if (!c) {
    c = createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 30_000 });
    conjuntos.set(jwksUrl, c);
  }
  return c;
}

export async function verificarIdToken(opts: {
  token: string | null | undefined;
  jwksUrl: string;
  issuers: string[];
  /** Os client IDs aceitos. Vazio significa "não configurado", nunca "aceita
   *  qualquer um" — sem client ID não há como saber se o token é nosso. */
  audiences: string[];
  nonceEsperado?: string | null;
}): Promise<Record<string, unknown>> {
  if (!opts.token || typeof opts.token !== "string") {
    throw new IdentidadeRecusada("sem_token", "Sign-in token is required");
  }
  if (opts.audiences.length === 0) {
    throw new IdentidadeRecusada("nao_configurado", "Sign-in is not available right now");
  }

  let payload: Record<string, unknown>;
  try {
    const verificado = await jwtVerify(opts.token, chaves(opts.jwksUrl), {
      issuer: opts.issuers,
      audience: opts.audiences,
      clockTolerance: 30,
    });
    payload = verificado.payload as Record<string, unknown>;
  } catch {
    throw new IdentidadeRecusada("token_invalido", NAO_DEU);
  }

  /**
   * O `nonce`, quando existe de qualquer um dos dois lados.
   *
   * O SDK nativo do Google não oferece nonce no fluxo padrão; o da Apple
   * oferece. Exigir sempre quebraria o Google; não conferir nunca desperdiça
   * a proteção onde ela existe. Então: se **qualquer** um dos lados tem um, os
   * dois precisam ter o mesmo. É o que impede aceitar de volta um token que o
   * cliente nunca pediu.
   */
  const noToken = typeof payload.nonce === "string" ? payload.nonce : null;
  const esperado = opts.nonceEsperado?.trim() || null;
  if ((noToken || esperado) && noToken !== esperado) {
    throw new IdentidadeRecusada("nonce_diferente", NAO_DEU);
  }

  return payload;
}

/** Claims booleanos chegam como `true` ou como a string `"true"` — a Apple usa
 *  a segunda forma. Ler só o booleano recusaria todo mundo que entra por lá. */
export function claimVerdadeiro(v: unknown): boolean {
  return v === true || v === "true";
}

export function textoDoClaim(payload: Record<string, unknown>, chave: string): string {
  return typeof payload[chave] === "string" ? (payload[chave] as string).trim() : "";
}
