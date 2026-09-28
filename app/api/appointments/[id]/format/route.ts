export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getActor,
  getSessionStaffActor,
  assertRecordAccess,
  accessErrorResponse,
  AccessError,
} from "@/lib/tenant-access";
import { logAudit } from "@/lib/system-logger";

/**
 * A clínica decide o formato que o paciente pediu (098 T-3).
 *
 * ## O que aprovar e recusar fazem
 *
 * **Aprovar** move `requestedMode` para `mode` — é o único caminho por onde o
 * formato muda a partir de um pedido. Para vídeo, a sala nasce como já nasce
 * hoje: na primeira vez que alguém entra.
 *
 * **Recusar não cancela.** A consulta continua de pé, presencial, no mesmo
 * horário, e guarda o motivo. Cancelar por causa do formato faria a clínica
 * perder a consulta junto com o pedido — e a pessoa teria de marcar de novo
 * por ter pedido algo.
 *
 * ## Quem decide
 *
 * Equipe da clínica dona da consulta. Qualquer outro recebe **404**, e não
 * 403: dizer "existe, mas não é sua" conta a um estranho que aquela consulta
 * existe. É a mesma regra do resto da agenda.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = (await getSessionStaffActor(request)) ?? (await getActor(request));
    if (!actor) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    // O paciente pede; quem decide é a clínica. Sem esta linha, quem pediu
    // aprovaria o próprio pedido.
    if (actor.role === "PATIENT") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const consulta = await prisma.appointment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        requestedMode: true,
        modeApprovedAt: true,
        modeRefusedReason: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });
    if (!consulta) throw new AccessError(404, "Not found");
    assertRecordAccess(actor, consulta);

    if (!consulta.requestedMode) {
      return NextResponse.json(
        { error: "This appointment has no format request" },
        { status: 409 }
      );
    }
    if (consulta.modeApprovedAt || consulta.modeRefusedReason) {
      return NextResponse.json(
        { error: "This request has already been decided" },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => null);
    const decisao = body?.decision;

    if (decisao !== "approve" && decisao !== "refuse") {
      return NextResponse.json({ error: "decision must be approve or refuse" }, { status: 400 });
    }

    const motivo = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (decisao === "refuse" && !motivo) {
      /**
       * Recusar **exige** um motivo.
       *
       * Uma recusa muda onde a pessoa vai estar naquela hora. "Não" sem frase
       * faz ela ligar para a clínica para perguntar por quê — e aí o trabalho
       * que a recusa economizou volta pelo telefone.
       */
      return NextResponse.json(
        { error: "Tell the patient why — a refusal without a reason sends them to the phone." },
        { status: 400 }
      );
    }

    const atualizada = await prisma.appointment.update({
      where: { id: consulta.id },
      data:
        decisao === "approve"
          ? {
              mode: consulta.requestedMode,
              modeApprovedAt: new Date(),
              modeDecidedById: actor.userId,
            }
          : {
              // `mode` não é tocado: ela já é presencial, e continua.
              modeRefusedReason: motivo,
              modeDecidedById: actor.userId,
            },
      select: { id: true, mode: true, modeApprovedAt: true, modeRefusedReason: true },
    });

    const nomeDoPaciente = `${consulta.patient.firstName} ${consulta.patient.lastName}`;
    // `Actor` carrega id, papel e tenant — nao o e-mail. O log pede um, e
    // busca-lo aqui e uma consulta a mais por decisao, o que e barato ao lado
    // de um registro incompleto de quem mexeu no prontuario de alguem.
    const quemDecidiu = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: { email: true },
    });
    logAudit({
      userId: actor.userId,
      userEmail: quemDecidiu?.email ?? "",
      userRole: actor.role,
      action: decisao === "approve" ? "APPOINTMENT_FORMAT_APPROVED" : "APPOINTMENT_FORMAT_REFUSED",
      entity: "Appointment",
      entityId: consulta.id,
      description:
        decisao === "approve"
          ? `Approved ${consulta.requestedMode} for ${nomeDoPaciente}'s appointment`
          : `Refused ${consulta.requestedMode} for ${nomeDoPaciente}'s appointment`,
      metadata: { requestedMode: consulta.requestedMode, ...(motivo ? { reason: motivo } : {}) },
    });

    /**
     * **Nada é enviado ao paciente aqui.**
     *
     * A decisão aparece no app quando ele abre, e quem avisa é a clínica, num
     * botão. É a regra que vale desde 17/09 e ela não muda por causa disto.
     */
    return NextResponse.json({ ok: true, appointment: atualizada });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[appointments/format] error:", (err as Error)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
