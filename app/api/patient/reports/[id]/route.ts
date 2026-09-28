export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { verifyFileToken } from "@/lib/file-access-token";

/**
 * Um relatório, como ele ficou (099 T-5).
 *
 * O HTML é o que foi guardado, não uma nova geração: um relatório é o retrato
 * de um período, e regerá-lo faria o de janeiro mudar quando um dado de
 * janeiro fosse corrigido em março — sem que quem leu o primeiro soubesse.
 *
 * O `patientId` entra no `where`, e não numa checagem depois: um id de outra
 * pessoa não devolve linha nenhuma, e o 404 sai sozinho.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  /**
   * Duas portas, e a segunda existe por um motivo concreto.
   *
   * O aplicativo abre o relatório no navegador do telefone, e **o navegador
   * não carrega o bearer**. É o mesmo problema que o documento clínico teve:
   * ele aparecia na lista e tocar nele não fazia nada, em silêncio.
   *
   * Então o link carrega a permissão — assinado, preso a um relatório, a uma
   * pessoa e a cinco minutos. O `middleware` precisa deixar passar o prefixo,
   * senão ele morre no portão de sessão antes de chegar aqui.
   */
  const assinado = verifyFileToken(req.nextUrl.searchParams.get("t"), params.id);

  let userId = assinado;
  if (!userId) {
    const gate = await patientGate();
    if (gate.response) return gate.response;
    userId = gate.gate!.userId;
  }

  const report = await (prisma as any).patientReport.findFirst({
    where: { id: params.id, patientId: userId },
    select: { html: true, periodStart: true, periodEnd: true, cadence: true },
  }).catch(() => null);

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(report.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
