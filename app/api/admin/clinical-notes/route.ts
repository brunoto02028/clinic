import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { isDbUnreachableError, MOCK_SOAP_NOTES, devFallbackResponse } from "@/lib/dev-fallback";

export const dynamic = 'force-dynamic';

/**
 * As notas SOAP da clínica — e só dela.
 *
 * Lia o tenant do header `x-clinic-id` e, quando ele vinha vazio,
 * `withClinicFilter` devolvia o `where` **sem filtro**: o admin de uma clínica
 * cujo header não resolvia via as notas de todas as outras (QA da 081, T-2,
 * 25/09/2026). Nota clínica é o dado mais sensível que existe aqui.
 *
 * Agora o tenant vem de `getSessionStaffActor`, que relê papel e clínica do
 * banco e resolve a clínica selecionada para o SUPERADMIN. Sem clínica não há
 * "todas": há 403. Mesma família das rotas antigas com `session.user.clinicId`
 * (memória de 16/09/2026).
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await getSessionStaffActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    if (!actor.clinicId) {
      return NextResponse.json({ error: "No clinic selected" }, { status: 403 });
    }

    const notes = await prisma.sOAPNote.findMany({
      where: { clinicId: actor.clinicId },
      include: {
        patient: {
          select: { firstName: true, lastName: true },
        },
        therapist: {
          select: { firstName: true, lastName: true },
        },
        appointment: {
          select: { dateTime: true, treatmentType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching clinical notes:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_SOAP_NOTES);
    }
    return NextResponse.json(
      { error: "Failed to fetch clinical notes" },
      { status: 500 }
    );
  }
}
