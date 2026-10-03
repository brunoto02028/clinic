import { NextRequest, NextResponse } from "next/server";
import { correrSincronizacaoDeWearables } from "@/lib/wearables-sync-run";

export const dynamic = "force-dynamic";

/**
 * Dispara a sincronização à mão (121 T-6).
 *
 * **O laço mudou de casa.** Vivia todo aqui, atrás deste segredo — e nada o
 * chamava: zero tarefas agendadas no Coolify, e nenhum dos nove jobs do
 * agendador interno era este. A rede de segurança escrita na 075 T-11 nunca
 * esteve pendurada, e a ligação do Bruno ficou 27 dias sem dado com o webhook
 * morto.
 *
 * Agora o laço vive em `lib/wearables-sync-run.ts` e o agendador corre-o de 15
 * em 15 minutos. Esta rota fica, para quem quiser disparar fora de hora — mas
 * é a **mesma** função, porque um laço copiado seria dois laços a divergir.
 *
 * Chamada: curl -X POST https://bpr.clinic/api/cron/wearables-sync?key=SECRET
 */
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!cronSecret || key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await correrSincronizacaoDeWearables());
}
