export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getValidatedUserById } from "@/lib/auth-credentials";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { verificarIdTokenDoGoogle } from "@/lib/google-identity";
import { IdentidadeRecusada } from "@/lib/oidc-verify";
import { entrarOuCriarComIdentidade } from "@/lib/social-signin";
import { emitirParDeTokens, httpDaRecusa } from "@/lib/social-signin-http";
import { rateLimit } from "@/lib/rate-limit";
import { sysLog } from "@/lib/system-logger";

/**
 * Entrar com Google, pelo aplicativo (097 T-1).
 *
 * ## O que esta rota devolve
 *
 * **Exatamente** o que `/api/mobile/login` devolve: `accessToken`,
 * `refreshToken` e `user`. Se ela inventasse um formato próprio, o aplicativo
 * teria dois jeitos de estar logado, e o segundo envelheceria sozinho.
 *
 * As recusas — conta gerida, conta da clínica, conta que já existe com aquele
 * e-mail — moram em `lib/social-signin.ts`, junto com as da Apple: o que muda
 * entre os dois provedores é só como se prova quem é a pessoa.
 */

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const limite = rateLimit(`mobile-google:${ip}`, { max: 10, windowMs: 60_000 });
    if (!limite.allowed) {
      return corsJson(
        { error: "Too many attempts. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => null);

    let identidade;
    try {
      identidade = await verificarIdTokenDoGoogle(body?.idToken, {
        nonceEsperado: body?.nonce ?? null,
      });
    } catch (err: any) {
      if (err instanceof IdentidadeRecusada) {
        // Nenhum token em log — nem sucesso, nem erro, nem pedaço dele.
        sysLog.auth(`Google sign-in refused: ${err.motivo}`, {
          level: "WARN",
          details: { reason: err.motivo, ip },
          source: "auth",
        });
        return corsJson({ error: err.mensagem }, { status: httpDaRecusa(err.motivo) });
      }
      throw err;
    }

    const r = await entrarOuCriarComIdentidade(
      { provider: "google", ...identidade },
      { tenantSlug: body?.tenantSlug ?? null, origem: "app" }
    );
    if (r.tipo === "recusado") return corsJson(r.corpo, { status: r.status });

    const user = await getValidatedUserById(r.userId);
    if (!user) return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });

    return corsJson(await emitirParDeTokens(user, request), { status: r.novo ? 201 : 200 });
  } catch (error: any) {
    console.error("[AUTH/mobile/google] error:", error?.message);
    return corsJson({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
