export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { audienciasAceitas as audienciasDoGoogle } from "@/lib/google-identity";
import { audienciasAceitas as audienciasDaApple } from "@/lib/apple-identity";

/**
 * O que está ligado nesta conta, e o que sequer existe (097 T-2).
 *
 * ## Duas perguntas, uma resposta
 *
 * `google`/`apple` dizem **o que esta pessoa ligou**; `googleAvailable` e
 * `appleAvailable` dizem **se o servidor está configurado para aquilo**. Sem a
 * segunda metade, a tela ofereceria "ligar o Google" num servidor sem client
 * ID, e a pessoa tocaria num botão que só pode falhar.
 *
 * `hasPassword` é o que impede a tela de oferecer um desligamento que deixaria
 * alguém sem nenhuma forma de entrar.
 */

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) return corsJson({ error: "Unauthorised" }, { status: 401 });

  const [contas, eu] = await Promise.all([
    prisma.account.findMany({
      where: { userId: payload.sub },
      select: { provider: true },
    }),
    prisma.user.findUnique({
      where: { id: payload.sub },
      select: { password: true },
    }),
  ]);

  const ligados = new Set(contas.map((c) => c.provider));
  return corsJson({
    google: ligados.has("google"),
    apple: ligados.has("apple"),
    hasPassword: !!eu?.password,
    googleAvailable: audienciasDoGoogle().length > 0,
    appleAvailable: audienciasDaApple().length > 0,
  });
}
