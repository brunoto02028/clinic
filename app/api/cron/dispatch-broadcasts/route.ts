import { NextRequest, NextResponse } from "next/server";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";

export const dynamic = "force-dynamic";

/**
 * Envia os broadcasts agendados cuja hora chegou.
 *
 * Estava aberta: `GET` sem chave, comentada como "public cron endpoint", numa
 * rota que manda mensagem para paciente. Qualquer pessoa na internet podia
 * disparar os envios da clínica na hora que quisesse — não dá para mandar duas
 * vezes, porque a reivindicação é atômica, mas dá para mandar **antes da
 * hora**, que numa mensagem agendada é o estrago. Agora usa a mesma chave dos
 * outros treze crons.
 *
 * `POST` como os demais, e `GET` mantido apenas porque agendadores externos
 * costumam só saber fazer GET — ambos exigem a chave.
 *
 * Chamada: curl -X POST https://bpr.clinic/api/cron/dispatch-broadcasts?key=SECRET
 */
function authorised(req: NextRequest): boolean {
  const key = req.nextUrl.searchParams.get("key");
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  return !!secret && key === secret;
}

async function run() {
  try {
    const dispatched = await dispatchDueBroadcasts();
    console.log(`[cron/dispatch-broadcasts] dispatched=${dispatched}`);
    return NextResponse.json({ dispatched });
  } catch (err: any) {
    console.error("[cron/dispatch-broadcasts] error:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return run();
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return run();
}
