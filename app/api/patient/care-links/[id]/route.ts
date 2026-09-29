import { NextRequest, NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { encerrarVinculo } from "@/lib/care-link";

export const dynamic = "force-dynamic";

/**
 * O paciente encerra o acesso de um profissional (102 T-3).
 *
 * Corta **dali para frente**. O que já aconteceu fica: a consulta que houve e a
 * receita que foi escrita são registro clínico, e apagá-las sumiria com a prova
 * de uma prescrição.
 *
 * Quem decide é ele, e só sobre os vínculos dele — o `patientId` entra no
 * `where` do `updateMany`, então um id que não é seu simplesmente não existe.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await patientGate();
  if (gate.response) return gate.response;
  const userId = gate.gate!.userId;

  const ok = await encerrarVinculo({
    patientId: userId,
    careLinkId: params.id,
    endedById: userId,
  });

  if (!ok) {
    // Já encerrado, ou de outra pessoa. A mesma frase para os dois: distinguir
    // contaria a alguém que aquele vínculo existe.
    return NextResponse.json(
      {
        error: "That access is not open.",
        errorPt: "Esse acesso não está aberto.",
        code: "not_open",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ ended: true });
}
