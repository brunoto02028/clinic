export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionStaffActor } from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

/** Closing the window on purpose — the patient left, or it was opened by mistake. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getSessionStaffActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const session = await (prisma as any).clinicMeasurementSession.findUnique({
    where: { id: params.id },
    select: { id: true, clinicId: true, status: true, patientId: true },
  });
  if (!session || !actor.clinicId || session.clinicId !== actor.clinicId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  /**
   * **`EXPIRED` também se cancela** (achado do QA, 03/10).
   *
   * Uma janela expirada **continua a reclamar medições**: está em
   * `MATCHABLE_SESSION_STATUSES` de propósito, desde 24/09, para a leitura que
   * sobe horas depois — visita domiciliar, manguito sem rede — não se perder.
   *
   * O efeito colateral é a janela abandonada: o terapeuta abre-a num paciente,
   * acaba por não medir, e **qualquer medição carimbada naqueles três minutos**
   * entra na ficha daquele paciente. Inclusive uma que o dono do aparelho faça
   * em si mesmo logo a seguir. E, até agora, não havia como desdizer: o botão
   * de cancelar só existia enquanto a contagem corria.
   *
   * `COMPLETED` continua de fora — essa já recebeu a sua leitura, e cancelá-la
   * deixaria a leitura sem a explicação de como foi atribuída.
   */
  if (session.status !== "OPEN" && session.status !== "EXPIRED") {
    // "Nothing to cancel" is not an error.
    return NextResponse.json({ session, alreadyClosed: true });
  }

  const updated = await (prisma as any).clinicMeasurementSession.update({
    where: { id: session.id },
    data: { status: "CANCELLED", closedAt: new Date(), cancelledById: actor.userId },
    select: { id: true, status: true, closedAt: true },
  });

  await logAudit({
    userId: actor.userId,
    userEmail: "",
    userRole: actor.role,
    action: "CLINIC_MEASUREMENT_SESSION_CANCEL",
    entity: "ClinicMeasurementSession",
    entityId: session.id,
    description: "Measurement window cancelled",
    metadata: { patientId: session.patientId },
  });

  return NextResponse.json({ session: updated });
}
