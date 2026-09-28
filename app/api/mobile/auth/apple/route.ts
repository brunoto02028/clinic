export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getValidatedUserById } from "@/lib/auth-credentials";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { verificarIdTokenDaApple } from "@/lib/apple-identity";
import { IdentidadeRecusada } from "@/lib/oidc-verify";
import { entrarOuCriarComIdentidade } from "@/lib/social-signin";
import { emitirParDeTokens, httpDaRecusa } from "@/lib/social-signin-http";
import { rateLimit } from "@/lib/rate-limit";
import { sysLog } from "@/lib/system-logger";

/**
 * Entrar com Apple, pelo aplicativo (097 T-4).
 *
 * ## Por que ela não é opcional
 *
 * A App Review exige Sign in with Apple em todo aplicativo que oferece login
 * social de terceiro. Publicar o botão do Google sem este seria reprovação na
 * revisão, não uma escolha de produto.
 *
 * ## O nome, que só chega uma vez
 *
 * A Apple devolve o nome da pessoa **apenas na primeira autorização**. Ele vem
 * no corpo desta requisição, vindo do aplicativo, e por isso só é usado quando
 * a conta nasce — ver `lib/apple-identity.ts`.
 */

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const limite = rateLimit(`mobile-apple:${ip}`, { max: 10, windowMs: 60_000 });
    if (!limite.allowed) {
      return corsJson(
        { error: "Too many attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);

    let identidade;
    try {
      identidade = await verificarIdTokenDaApple(body?.identityToken, {
        nonceEsperado: body?.nonce ?? null,
        nome: body?.fullName ?? null,
      });
    } catch (err: any) {
      if (err instanceof IdentidadeRecusada) {
        // Nenhum token em log — nem sucesso, nem erro, nem pedaço dele.
        sysLog.auth(`Apple sign-in refused: ${err.motivo}`, {
          level: "WARN",
          details: { reason: err.motivo, ip },
          source: "auth",
        });
        return corsJson({ error: err.mensagem }, { status: httpDaRecusa(err.motivo) });
      }
      throw err;
    }

    const r = await entrarOuCriarComIdentidade(
      {
        provider: "apple",
        sub: identidade.sub,
        email: identidade.email,
        firstName: identidade.firstName,
        lastName: identidade.lastName,
      },
      { tenantSlug: body?.tenantSlug ?? null, origem: "app" }
    );
    if (r.tipo === "recusado") return corsJson(r.corpo, { status: r.status });

    const user = await getValidatedUserById(r.userId);
    if (!user) return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });

    return corsJson(await emitirParDeTokens(user, request), { status: r.novo ? 201 : 200 });
  } catch (error: any) {
    console.error("[AUTH/mobile/apple] error:", error?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
