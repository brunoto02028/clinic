import { NextRequest, NextResponse } from "next/server";
import { patientGate } from "@/lib/patient-gate";
import { ShareError, revogar } from "@/lib/care-share";

export const dynamic = "force-dynamic";

/**
 * O paciente corta uma partilha (102 T-9).
 *
 * *"O paciente vê, e pode revogar."* `patientId` no `where` é o que garante que
 * ele só corta o que é sobre ele — e a rota não pede motivo: ele não deve
 * justificativa a ninguém sobre o próprio prontuário.
 *
 * Corta dali para frente. A linha fica, porque quem leu leu, e apagar o registro
 * apagaria a prova de que houve acesso.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await patientGate();
  if (gate.response) return gate.response;
  const userId = gate.gate!.userId;

  try {
    await revogar({
      shareId: params.id,
      porUserId: userId,
      porRole: "PATIENT",
      patientId: userId,
      motivo: "Revoked by the patient",
    });
    return NextResponse.json({ revoked: true });
  } catch (e) {
    if (e instanceof ShareError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    }
    throw e;
  }
}
