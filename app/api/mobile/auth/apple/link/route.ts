export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { ehSessaoDeTerceiro } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { verificarIdTokenDaApple } from "@/lib/apple-identity";
import { IdentidadeRecusada } from "@/lib/oidc-verify";
import { ligarProvedor, desligarProvedor } from "@/lib/social-signin";
import { httpDaRecusa } from "@/lib/social-signin-http";

/**
 * Ligar e desligar a Apple de uma conta que já existe (097 T-2/T-4).
 *
 * Mesma regra do Google: `/api/mobile/auth/apple` recusa quem já tem conta com
 * aquele e-mail, e o vínculo se cria aqui, depois da senha.
 */

export function OPTIONS() {
  return corsPreflight();
}

const NAO_E_VOCE = {
  error: "Switch back to your own account to manage this.",
  errorPt: "Volte para a sua conta para gerir isto.",
  code: "on_behalf_read_only",
};

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });
  if (ehSessaoDeTerceiro(payload)) return corsJson(NAO_E_VOCE, { status: 403 });

  const body = await request.json().catch(() => null);

  let identidade;
  try {
    identidade = await verificarIdTokenDaApple(body?.identityToken, {
      nonceEsperado: body?.nonce ?? null,
      nome: body?.fullName ?? null,
    });
  } catch (err: any) {
    if (err instanceof IdentidadeRecusada) {
      return corsJson({ error: err.mensagem }, { status: httpDaRecusa(err.motivo) });
    }
    throw err;
  }

  const r = await ligarProvedor(payload.sub, {
    provider: "apple",
    sub: identidade.sub,
    email: identidade.email,
    firstName: identidade.firstName,
    lastName: identidade.lastName,
  });
  if (!r.ok) return corsJson(r.corpo, { status: r.status });
  return corsJson({ linked: true, ...(r.jaEstava ? { alreadyLinked: true } : {}) });
}

export async function DELETE(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });
  if (ehSessaoDeTerceiro(payload)) return corsJson(NAO_E_VOCE, { status: 403 });

  const r = await desligarProvedor(payload.sub, "apple");
  if (!r.ok) return corsJson(r.corpo, { status: r.status });
  return corsJson({ linked: false, ...(r.nadaAFazer ? { nothingToDo: true } : {}) });
}
