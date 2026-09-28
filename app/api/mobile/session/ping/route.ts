export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";
import { getMobileActor } from "@/lib/mobile-actor";
import { registrarSinal, INTERVALO_SINAL_MS } from "@/lib/app-usage";
import { cidadeDoIp, ipDaRequisicao } from "@/lib/geo-ip";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * "Continuo aqui" (085, T-1).
 *
 * O app chama na abertura e a cada poucos minutos **em primeiro plano**. Não é
 * um evento de analytics: é o que permite responder "quanto tempo essa pessoa
 * usa o app" sem guardar cada toque.
 *
 * **Quem é a pessoa vem do token, nunca do corpo.** Um `userId` no corpo seria
 * um jeito de atribuir uso a outra conta — e a clínica também vem do actor,
 * pela mesma razão que as notas SOAP vazaram quando não vinha (1b4109a5).
 *
 * Responde 200 mesmo quando não consegue gravar. Um sinal de uso que devolve
 * erro faria o app tentar de novo, ou pior, mostrar alguma coisa — e isto não
 * é do interesse de quem está usando o app, é do nosso.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await getMobileActor(request);
    if (!actor) return corsJson({ error: "Unauthorized" }, { status: 401 });

    const corpo = await request.json().catch(() => ({} as Record<string, unknown>));

    const r = await registrarSinal({
      userId: actor.userId,
      clinicId: actor.clinicId ?? null,
      // O que o aparelho sabe de si: plataforma e versão. Nada que identifique
      // o aparelho, e nada que a pessoa não veja no rodapé do próprio menu.
      platform: typeof corpo.platform === "string" ? corpo.platform.slice(0, 20) : null,
      appVersion: typeof corpo.appVersion === "string" ? corpo.appVersion.slice(0, 40) : null,
      /**
       * A cidade, e só se uma sessão nova nascer (085, T-2).
       *
       * Passada como função de propósito: quase todo sinal continua uma sessão
       * que já existe, e resolver o IP a cada três minutos seria consultar um
       * provedor para descartar a resposta. **O IP não é guardado** — só a
       * cidade que sai dele.
       */
      resolverLocal: () => cidadeDoIp(ipDaRequisicao(request)),
    });

    return corsJson({ ok: true, sessionId: r?.sessionId ?? null, nextPingMs: INTERVALO_SINAL_MS });
  } catch (error: any) {
    console.error("[mobile/session/ping]", error?.message);
    return corsJson({ ok: false }, { status: 200 });
  }
}
