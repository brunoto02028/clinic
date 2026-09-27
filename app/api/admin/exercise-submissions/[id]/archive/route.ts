export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

/**
 * Arquivar o vídeo do paciente — tirar da vista, nunca do prontuário (095 T-6).
 *
 * Pedido do Bruno: *"O vídeo do paciente quero poder arquivar, para deixar o
 * layout do dashboard mais limpo."*
 *
 * **Arquivar não é apagar, e a diferença é a única coisa que importa aqui.** O
 * vídeo é registro clínico: é a execução de um exercício, numa data, que o
 * terapeuta pode precisar rever meses depois para comparar. O que sai é a
 * presença dele na lista; o arquivo, a data e a correção ficam, e o filtro os
 * traz de volta.
 *
 * Por isso é `archivedAt` e não `delete`: um botão de limpeza que apaga é o
 * tipo de coisa que se descobre tarde.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(req);
  if (!actor?.clinicId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // `false` desarquiva. O padrão é arquivar, que é o que o botão faz.
  const arquivar = body?.archived !== false;

  // A clínica no `where`: um id de outra clínica simplesmente não existe aqui.
  const envio = await (prisma as any).exerciseSubmission.findFirst({
    where: { id: params.id, clinicId: actor.clinicId },
    select: { id: true, patientId: true, archivedAt: true },
  });
  if (!envio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const atualizado = await (prisma as any).exerciseSubmission.update({
    where: { id: envio.id },
    data: {
      archivedAt: arquivar ? new Date() : null,
      archivedById: arquivar ? actor.userId : null,
    },
    select: { id: true, archivedAt: true },
  });

  await logAudit({
    userId: actor.userId,
    userEmail: "",
    userRole: String(actor.role),
    action: arquivar ? "EXERCISE_SUBMISSION_ARCHIVED" : "EXERCISE_SUBMISSION_UNARCHIVED",
    entity: "ExerciseSubmission",
    entityId: envio.id,
    description: arquivar
      ? "Therapist archived a patient's exercise submission"
      : "Therapist brought an archived submission back",
    metadata: { patientId: envio.patientId },
  }).catch(() => {});

  /**
   * O paciente não é avisado, e é de propósito.
   *
   * Arquivar é arrumação da clínica. Mandar "sua gravação foi arquivada" seria
   * transformar uma decisão de organização interna numa notícia sobre o
   * tratamento dele — e, pior, numa que soa como se algo tivesse sido perdido.
   */
  return NextResponse.json({ submission: atualizado });
}
