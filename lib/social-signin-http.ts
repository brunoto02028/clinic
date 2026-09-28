import type { NextRequest } from "next/server";
import type { ValidatedUser } from "@/lib/auth-credentials";
import { signAccessToken, issueRefreshToken } from "@/lib/mobile-tokens";
import { withAbsoluteLogo } from "@/lib/mobile-user";
import type { MotivoDaRecusa } from "@/lib/oidc-verify";

/**
 * O pedaço HTTP do login social (097 T-1/T-4).
 *
 * Separado de `lib/social-signin.ts` de propósito: aquele arquivo decide
 * **quem é a pessoa e se ela entra**, e não deve saber o que é um
 * `NextRequest`. Aqui mora o que é da rota — o par de tokens e o código de
 * status de cada recusa.
 */

/** O mesmo par que `/api/mobile/login` emite — nem um campo a mais. */
export async function emitirParDeTokens(user: ValidatedUser, request: NextRequest) {
  const accessToken = signAccessToken(user);
  let refreshToken: string | null = null;
  try {
    refreshToken = await issueRefreshToken(
      user.id,
      request.headers.get("user-agent") || undefined
    );
  } catch {
    // mobile_refresh_tokens pode não existir ainda — o login funciona só com o
    // access token, como em `/api/mobile/login`.
  }
  return { accessToken, refreshToken, user: withAbsoluteLogo(user) };
}

/**
 * 503 quando **nós** não estamos configurados, 400 quando falta o token, 401
 * para todo o resto.
 *
 * A distinção importa para o app: 503 é "volte depois", e 401 é "isto não vai
 * dar certo tentando de novo".
 */
export function httpDaRecusa(motivo: MotivoDaRecusa): number {
  if (motivo === "nao_configurado") return 503;
  if (motivo === "sem_token") return 400;
  return 401;
}
