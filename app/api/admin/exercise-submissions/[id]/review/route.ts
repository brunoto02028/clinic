export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";
import { pushRespostaAoVideo } from "@/lib/push-notify";

/**
 * A correção do terapeuta sobre um envio.
 *
 * É o que fecha o ciclo: sem isto o paciente manda vídeo para o vazio, e a
 * funcionalidade inteira vira uma caixa de entrada que ninguém responde.
 *
 * Marcar como revisado tira da fila. O retorno é opcional de propósito — um
 * "vi e está certo" também é resposta, e obrigar texto faria o terapeuta
 * escrever qualquer coisa só para limpar a fila.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await getSessionStaffActor(req);
  if (!actor?.clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Corpo vazio é válido: revisar sem escrever nada.
  }
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  // A clínica no `where`: um id de outra clínica simplesmente não existe aqui.
  const submission = await (prisma as any).exerciseSubmission.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { id: true, patientId: true, reviewedAt: true },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const atualizado = await (prisma as any).exerciseSubmission.update({
    where: { id: submission.id },
    data: {
      reviewedById: actor.userId,
      reviewedAt: new Date(),
      reviewNote: note || null,
    },
    select: { id: true, reviewedAt: true, reviewNote: true },
  });

  await logAudit({
    userId: actor.userId,
    userEmail: "",
    userRole: String(actor.role),
    action: "EXERCISE_SUBMISSION_REVIEWED",
    entity: "ExerciseSubmission",
    entityId: submission.id,
    description: "Therapist reviewed a patient's exercise submission",
    metadata: { patientId: submission.patientId, hasNote: !!note },
  }).catch(() => {});

  // O toque no ombro. Uma pessoa da clínica acabou de assistir e responder —
  // o push só conta isso. Falhar aqui não desfaz a revisão, que já está no
  // banco (`.catch` dentro de `pushRespostaAoVideo`).
  await pushRespostaAoVideo(submission.patientId);

  return NextResponse.json({ submission: atualizado });
}
