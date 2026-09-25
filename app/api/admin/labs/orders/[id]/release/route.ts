export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { labStaff, auditLab } from "@/lib/lab-admin";
import { pushDocumento } from "@/lib/push-notify";

/**
 * A liberação (081, T-2): o momento em que o paciente passa a ver o resultado.
 *
 * Decisão do Bruno em 25/09/2026: ele vê primeiro, escreve uma linha, e só
 * então o paciente vê. Por isso:
 *
 * - só libera o que **chegou** (`RESULTS_READY`) e **tem valores** — liberar
 *   um pedido vazio seria mandar a pessoa olhar o nada;
 * - liberar duas vezes não faz nada: a segunda responde 409, não reenvia push;
 * - o comentário é EN primeiro; PT vazio cai no EN na tela do paciente;
 * - o push não diz o que o exame mediu. Tela de bloqueio não é prontuário.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await labStaff(request);
  if ("response" in guard) return guard.response;
  const { clinicId, userId } = guard.actor;
  const { id } = await params;

  const order = await prisma.labOrder.findFirst({
    where: { id, clinicId },
    include: { registrations: { select: { _count: { select: { values: true } } } } },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.releasedToPatientAt) {
    return NextResponse.json({ error: "Already released", errorPt: "Já liberado", code: "already_released" }, { status: 409 });
  }
  if (order.status !== "RESULTS_READY") {
    return NextResponse.json({ error: "The result has not arrived yet", errorPt: "O resultado ainda não chegou", code: "not_ready" }, { status: 409 });
  }
  if (!order.registrations.some((r) => r._count.values > 0)) {
    return NextResponse.json({ error: "There are no values to release", errorPt: "Não há valores para liberar", code: "no_results" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const noteEn = typeof body.noteEn === "string" ? body.noteEn.trim().slice(0, 4000) : "";
  const notePt = typeof body.notePt === "string" ? body.notePt.trim().slice(0, 4000) : "";

  const now = new Date();
  // updateMany com a guarda de "ainda não liberado": duas abas clicando ao
  // mesmo tempo produzem uma liberação, não duas.
  const r = await prisma.labOrder.updateMany({
    where: { id, clinicId, releasedToPatientAt: null },
    data: { releasedToPatientAt: now, releasedById: userId, releaseNote: noteEn || null, releaseNotePt: notePt || null },
  });
  if (r.count === 0) {
    return NextResponse.json({ error: "Already released", errorPt: "Já liberado", code: "already_released" }, { status: 409 });
  }

  await prisma.labOrderEvent.create({
    data: { orderId: id, status: "RELEASED", note: noteEn ? "with a note" : "without a note", metadata: { by: userId } },
  });
  await auditLab(userId, "LAB_RESULT_RELEASED", "LabOrder", id, `result of ${order.orderNumber} released to the patient${noteEn ? " with a note" : ""}`);

  // Neutro por desenho: "há algo novo no seu prontuário", nunca o exame.
  void pushDocumento(order.patientId);

  return NextResponse.json({ ok: true, releasedToPatientAt: now });
}
