import { NextRequest, NextResponse } from "next/server";
import { gerarRelatoriosVencidos } from "@/lib/patient-report-schedule";

export const dynamic = "force-dynamic";

/**
 * A rodada que gera os relatórios vencidos (099 T-5).
 *
 * **Ela não envia nada.** Gerar e disponibilizar acontecem aqui; avisar é o
 * interruptor do paciente, e sai por outro caminho.
 *
 * Também não faz nada enquanto `Clinic.autoReportsEnabled` estiver desligada —
 * que é o estado de nascença. Ligar é o momento em que a clínica inteira passa
 * a receber, e esse clique é do Bruno.
 *
 * Call: curl -X POST https://bpr.clinic/api/cron/patient-reports?key=SECRET
 */
export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (!cronSecret || key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await gerarRelatoriosVencidos();
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    console.error("[cron/patient-reports]", e?.message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
