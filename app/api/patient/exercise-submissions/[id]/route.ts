export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { patientGate } from "@/lib/patient-gate";
import { patientOnlyWriteRefusal } from "@/lib/patient-only-write";
import { deleteFromR2 } from "@/lib/r2";

/**
 * Apagar o próprio envio — enquanto ninguém o comentou.
 *
 * Depois de revisado, não. Um vídeo que o terapeuta já viu e sobre o qual
 * escreveu faz parte do registro clínico: apagá-lo deixaria um retorno
 * pendurado, falando de algo que ninguém mais pode ver.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await patientGate({ module: "mod_exercises" });
  if (gate.response) return gate.response;

  const refusal = patientOnlyWriteRefusal(gate.gate);
  if (refusal === "impersonation") {
    return NextResponse.json(
      { error: "Read-only during impersonation", errorPt: "Somente leitura durante a visualização" },
      { status: 403 }
    );
  }
  if (refusal === "not_patient") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patientId = gate.gate.userId;

  // `patientId` no `where`: o id sozinho não basta, senão um id adivinhado
  // apagaria o vídeo de outra pessoa.
  const submission = await (prisma as any).exerciseSubmission.findFirst({
    where: { id: params.id, patientId },
    select: { id: true, storageKey: true, reviewedAt: true },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (submission.reviewedAt) {
    return NextResponse.json(
      {
        error: "Your therapist has already reviewed this one.",
        errorPt: "Seu terapeuta já revisou este envio.",
        code: "already_reviewed",
      },
      { status: 409 }
    );
  }

  await (prisma as any).exerciseSubmission.delete({ where: { id: submission.id } });
  // Depois da linha: se a remoção do arquivo falhar sobra um objeto órfão, o
  // que é melhor que uma linha apontando para um arquivo que já não existe.
  await deleteFromR2(submission.storageKey).catch(() => {});

  return NextResponse.json({ deleted: true });
}
