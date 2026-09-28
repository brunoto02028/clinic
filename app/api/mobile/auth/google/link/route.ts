export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { ehSessaoDeTerceiro } from "@/lib/mobile-tokens";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { verificarIdTokenDoGoogle } from "@/lib/google-identity";
import { IdentidadeRecusada } from "@/lib/oidc-verify";
import { ligarProvedor, desligarProvedor } from "@/lib/social-signin";
import { httpDaRecusa } from "@/lib/social-signin-http";

/**
 * Ligar e desligar o Google de uma conta que já existe (097 T-2).
 *
 * ## Por que esta rota precisa existir
 *
 * `/api/mobile/auth/google` **recusa** quem já tem conta com aquele e-mail: o
 * e-mail sozinho não prova que é a mesma pessoa, e num prontuário clínico
 * entrar na conta errada é o pior erro possível. A prova a mais é a senha — e
 * é depois dela, com sessão na mão, que o vínculo se cria aqui.
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

  // Quem está vendo como a filha não mexe em credencial de ninguém — nem da
  // filha, que não tem conta, nem da própria.
  if (ehSessaoDeTerceiro(payload)) return corsJson(NAO_E_VOCE, { status: 403 });

  const body = await request.json().catch(() => null);

  let identidade;
  try {
    identidade = await verificarIdTokenDoGoogle(body?.idToken, {
      nonceEsperado: body?.nonce ?? null,
    });
  } catch (err: any) {
    if (err instanceof IdentidadeRecusada) {
      return corsJson({ error: err.mensagem }, { status: httpDaRecusa(err.motivo) });
    }
    throw err;
  }

  const r = await ligarProvedor(payload.sub, { provider: "google", ...identidade });
  if (!r.ok) return corsJson(r.corpo, { status: r.status });
  return corsJson({ linked: true, ...(r.jaEstava ? { alreadyLinked: true } : {}) });
}

export async function DELETE(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });
  if (ehSessaoDeTerceiro(payload)) return corsJson(NAO_E_VOCE, { status: 403 });

  const r = await desligarProvedor(payload.sub, "google");
  if (!r.ok) return corsJson(r.corpo, { status: r.status });
  return corsJson({ linked: false, ...(r.nadaAFazer ? { nothingToDo: true } : {}) });
}
