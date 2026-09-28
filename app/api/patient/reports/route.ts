export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { signFileToken } from "@/lib/file-access-token";

/**
 * Os relatórios desta pessoa (099 T-5).
 *
 * Ela abre o app e eles estão lá — **isso é ela buscar, não nós enviarmos**, e
 * é essa distinção que faz o produto existir sem quebrar a regra de que nada
 * automático chega a um paciente.
 *
 * A lista não traz o HTML: são dezenas de quilobytes cada, e a tela só precisa
 * saber que eles existem e de quando são.
 */
export async function GET() {
  const gate = await patientGate();
  if (gate.response) return gate.response;

  const reports = await (prisma as any).patientReport.findMany({
    where: { patientId: gate.gate!.userId },
    orderBy: { periodStart: "desc" },
    take: 52,
    select: {
      id: true,
      cadence: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      therapistNote: true,
    },
  }).catch(() => []);

  // Cada um ja vem com o link que o navegador do telefone consegue abrir: o
  // bearer nao viaja para la, entao a permissao viaja no link (099 T-5).
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  return NextResponse.json({
    reports: (reports as any[]).map((r) => ({
      ...r,
      url: `${base}/api/patient/reports/${r.id}?t=${signFileToken(r.id, gate.gate!.userId)}`,
    })),
  });
}
