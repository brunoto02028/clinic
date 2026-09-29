import { NextRequest, NextResponse } from "next/server";
import { staffPatientAccess } from "@/lib/staff-patient-access";
import { ShareError, revogar } from "@/lib/care-share";

export const dynamic = "force-dynamic";

/**
 * Revogar uma partilha (102 T-9).
 *
 * **Corta dali para frente, e não apaga.** Quem leu leu — apagar a linha
 * apagaria a prova de que houve acesso, que é justamente o que o paciente tem
 * direito de consultar depois.
 *
 * Quem revoga é quem partilhou, pelo inquilino: `fromClinicId` no `where`. O
 * colega que **recebeu** não revoga o próprio acesso por aqui, e o paciente
 * revoga pela rota dele.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; shareId: string } }
) {
  const g = await staffPatientAccess(req, params.id, "Patient not found", {
    // Quem partilhou pode ter sido o profissional intermediado devolvendo algo.
    porVinculo: true,
  });
  if (g.response) return g.response;
  const actor = g.actor!;

  const body = await req.json().catch(() => ({}));

  try {
    await revogar({
      shareId: params.shareId,
      porUserId: actor.userId,
      porRole: String(actor.role),
      fromClinicId: actor.clinicId!,
      patientId: params.id,
      motivo: typeof body?.reason === "string" ? body.reason : null,
    });
    return NextResponse.json({ revoked: true });
  } catch (e) {
    if (e instanceof ShareError) {
      return NextResponse.json(
        { error: e.message, errorPt: e.messagePt ?? e.message, code: e.code },
        { status: e.status }
      );
    }
    throw e;
  }
}
