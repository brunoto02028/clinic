export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { dataEHoraDaClinica } from "@/lib/clinic-timezone";
import { prisma } from "@/lib/db";
import { janelaDaConsulta, minutosAntesPara } from "@/lib/video-call";
import { notifyPatient, pediramEnviarAoPaciente } from "@/lib/notify-patient";
import { pushConsulta } from "@/lib/push-notify";
import { syncSessionsUsed } from "@/lib/package-sessions";
import { notifyWaitlistForCancelledAppointment } from "@/lib/waitlist";
import { escapeHtml } from "@/lib/admin-notify-email";
import { localDaConsulta } from "@/lib/appointment-location";
import { assertModuleAccess } from "@/lib/module-access";
import {
  getActor,
  getSessionStaffActor,
  assertRecordAccess,
  accessErrorResponse,
  AccessError,
  type Actor,
} from "@/lib/tenant-access";

// Staff keep their real identity even with "View as Patient" active — the
// middleware swaps the headers to the patient's on every non-/api/admin
// route, and an admin editing the calendar in another tab must not be treated
// as that patient. Everyone else (patient on web or app) via getActor.
async function resolveActor(request: NextRequest): Promise<Actor | null> {
  return (await getSessionStaffActor(request)) ?? (await getActor(request));
}

// Loads the appointment's owner/tenant and checks the actor may touch it: the
// patient it belongs to, or staff of its tenant (activity 52, T-4). Anything
// else is a 404, so another tenant's appointment ids don't reveal they exist.
async function assertAppointmentAccess(actor: Actor, id: string) {
  const appt = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, clinicId: true, patientId: true, status: true },
  });
  // Same message as an unreachable one, so the response doesn't reveal the id exists.
  if (!appt) throw new AccessError(404, "Not found");
  assertRecordAccess(actor, appt);
  return appt;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await resolveActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    try {
      await assertAppointmentAccess(actor, id);
      /**
       * **O detalhe pede o mesmo que a lista** (110, achado do teste).
       *
       * Terceira vez no mesmo dia que uma lista foi fechada e o detalhe ficou
       * aberto — antes foram o PDF da nota clínica e o relatório por id. Desta
       * vez não fui eu que percebi: assim que `/api/appointments` passou a
       * pedir `mod_appointments`, a varredura de pares lista/detalhe acusou
       * esta rota no ato.
       *
       * Só o paciente: staff lê consulta por id o tempo todo, e a parede de
       * inquilino deles é o `assertAppointmentAccess` acima.
       */
      if (actor.role === "PATIENT") {
        await assertModuleAccess(actor.userId, "mod_appointments");
      }
    } catch (err) {
      return accessErrorResponse(err);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        therapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        payment: true,
        soapNote: true,
        // De quantos minutos antes esta clínica abre a sala (29/09/2026).
        clinic: { select: { videoEarlyMinutes: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    /**
     * **A hora em que a sala abre sai do servidor**, e não da conta do app.
     *
     * O app recalculava a janela com uma constante própria de dez minutos.
     * Duas cópias da mesma regra é a garantia de que uma delas vai mentir — e
     * agora que o minuto é da clínica, o app não tem como saber sozinho.
     *
     * Ele recebe duas datas prontas e compara com o relógio. Nada mais.
     */
    const { videoOpensAt, videoClosesAt } =
      appointment.mode === "VIDEO"
        ? (() => {
            /**
             * A hora que o **paciente** vê. Quem atende abre desde o começo do
             * dia, mas dizer isso ao paciente o faria esperar numa sala vazia.
             */
            const { inicio, fim } = janelaDaConsulta(
              appointment.dateTime,
              appointment.duration,
              minutosAntesPara(false, appointment.dateTime, (appointment as any).clinic?.videoEarlyMinutes)
            );
            return {
              videoOpensAt: new Date(inicio * 1000).toISOString(),
              videoClosesAt: new Date(fim * 1000).toISOString(),
            };
          })()
        : { videoOpensAt: null, videoClosesAt: null };

    return NextResponse.json({
      appointment: {
        ...appointment,
        videoOpensAt,
        videoClosesAt,
        /** A sala já existe: alguém a abriu, e dá para entrar. */
        videoRoomReady: !!appointment.videoRoomUrl,
      },
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

async function handleUpdate(
  request: NextRequest,
  params: { id: string }
) {
  try {
    const actor = await resolveActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json().catch(() => undefined);
    if (body === undefined) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const userRole = actor.role;

    let current: { status: string };
    try {
      current = await assertAppointmentAccess(actor, id);
    } catch (err) {
      return accessErrorResponse(err);
    }

    // A patient may only cancel their own upcoming appointment — never change
    // its price, time or anything else (a patient set their own session to
    // £0.30), nor "cancel" one already completed. Rescheduling goes through
    // /reschedule, which applies the fee rules.
    if (userRole === "PATIENT") {
      const keys = Object.keys(body ?? {});
      if (body?.status !== "CANCELLED" || keys.some((k) => k !== "status")) {
        return NextResponse.json(
          { error: "Patients can only cancel appointments" },
          { status: 403 }
        );
      }
      if (!["PENDING", "PENDING_PATIENT", "CONFIRMED"].includes(current.status)) {
        return NextResponse.json(
          { error: "Only upcoming appointments can be cancelled" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};

    if (body?.dateTime) updateData.dateTime = new Date(body.dateTime);
    if (body?.duration) updateData.duration = body.duration;
    if (body?.treatmentType) updateData.treatmentType = body.treatmentType;
    if (body?.status) updateData.status = body.status;
    if (body?.notes !== undefined) updateData.notes = body.notes;
    // `!= null`, e não a veracidade: editar o preço para **zero** era ignorado
    // em silêncio, e a tela recarregava mostrando o valor antigo. Isentar uma
    // consulta depois do fato não tinha caminho (achado da revisão).
    if (body?.price != null) updateData.price = Number(body.price);

    /**
     * Virar uma consulta já marcada para vídeo, ou de volta para presencial.
     *
     * O modo só existia na **criação**: quem marcasse presencial e depois
     * combinasse por vídeo tinha de apagar e remarcar, perdendo o horário e o
     * histórico. Foi assim que a consulta por vídeo pareceu não existir — a
     * agenda estava cheia de presenciais e não havia por onde transformar uma.
     *
     * Fora da lista do paciente de propósito: a guarda acima já recusa
     * qualquer campo que não seja `status: CANCELLED` vindo dele, e mudar o
     * formato do próprio atendimento é decisão de quem atende.
     */
    if (body?.mode !== undefined) {
      // `HOME_VISIT` entrou na 098: sao tres formatos, e a clinica escolhe os
      // tres direto — o paciente so pode **pedir**.
      if (!["IN_PERSON", "VIDEO", "HOME_VISIT"].includes(body.mode)) {
        return NextResponse.json(
          { error: "mode must be IN_PERSON, VIDEO or HOME_VISIT" },
          { status: 400 }
        );
      }
      updateData.mode = body.mode;
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        therapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Cancelar devolve a sessão ao pacote; `NO_SHOW` não devolve, porque o
    // horário foi perdido de verdade. `syncSessionsUsed` reconta, então os dois
    // casos saem certos sem ninguém somar nem subtrair.
    if (appointment.patientPackageId) {
      await syncSessionsUsed(appointment.patientPackageId).catch(() => {});
    }

    /**
     * **Nada sai para o paciente sem alguém pedir** (regra da casa, 17/09/2026).
     *
     * Isto avisava por e-mail **e** push a cada `PUT` de staff, sem condição
     * nenhuma. O QA de 29/09 abriu o diálogo de edição, **não mudou nada**,
     * salvou — e o paciente recebeu *"Appointment Confirmed … has been
     * successfully booked"* sobre uma consulta antiga.
     *
     * Pior que a edição: marcar a consulta como **atendida** ou **faltou**
     * passa por aqui igual, e como o assunto só troca no cancelamento, quem
     * fechava o atendimento de ontem mandava ao paciente uma confirmação de
     * marcação nova.
     *
     * A criação já resolvia isto com uma caixa; a edição ficou de fora. Agora é
     * o mesmo predicado, e o mesmo padrão: o campo **ausente** não envia.
     *
     * A exceção é o paciente que cancela a própria consulta — o recibo do
     * próprio ato continua saindo, e o push para ele já não saía.
     */
    const ePaciente = userRole === "PATIENT";
    const avisarOPaciente = ePaciente || pediramEnviarAoPaciente(body?.notifyPatient);

    if (!ePaciente && avisarOPaciente) {
      await pushConsulta(
        appointment.patient.id,
        body?.status === "CANCELLED" ? "cancelada" : "remarcada"
      );
    }

    // Send notification to patient about update/cancellation via preferred channel
    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      const apptDate = new Date(appointment.dateTime);
      // O fuso da clínica, e não o do contêiner (que é UTC).
      const { dateStr, timeStr } = dataEHoraDaClinica(apptDate);
      const isCancellation = body?.status === 'CANCELLED';
      const slug = isCancellation ? 'APPOINTMENT_CANCELLED' : 'APPOINTMENT_CONFIRMATION';
      const plainMsg = isCancellation
        ? `Your appointment on ${dateStr} at ${timeStr} has been cancelled.`
        : `Your appointment has been updated: ${appointment.treatmentType} on ${dateStr} at ${timeStr}.`;
      const plainMsgPt = isCancellation
        ? `Sua consulta em ${dateStr} às ${timeStr} foi cancelada.`
        : `Sua consulta foi atualizada: ${appointment.treatmentType} em ${dateStr} às ${timeStr}.`;

      /**
       * O **campo** `mode`, e não uma expressão regular nas notas.
       *
       * Isto farejava "domicílio" no texto livre das anotações — de quando não
       * havia onde registar o formato. O campo existe desde a atividade 089, e
       * uma visita domiciliar marcada corretamente com as notas vazias recebia
       * no e-mail o endereço **da clínica**: a pessoa era mandada para a rua
       * enquanto o terapeuta ia à casa dela.
       *
       * O mesmo helper que o `POST` e a remarcação usam, para as três frases
       * não voltarem a divergir.
       */
      const location = await localDaConsulta(
        (appointment as any).clinicId,
        (appointment as any).mode,
        appointment.patient.id
      );

      // Surfaces any admin-written note (e.g. the home-visit detail above)
      // directly in the email instead of leaving it invisible to the patient.
      const notesBlockHtml = appointment.notes
        ? `<p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 16px;background:#F5F4F1;border-radius:8px;padding:10px 14px;"><strong>Note:</strong> ${escapeHtml(appointment.notes)}</p>`
        : '';
      const notesBlockHtmlPt = appointment.notes
        ? `<p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 16px;background:#F5F4F1;border-radius:8px;padding:10px 14px;"><strong>Nota:</strong> ${escapeHtml(appointment.notes)}</p>`
        : '';

      if (avisarOPaciente) await notifyPatient({
        patientId: appointment.patient.id,
        emailTemplateSlug: slug,
        emailVars: {
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          location,
          notesBlock: notesBlockHtml,
          notesBlockPt: notesBlockHtmlPt,
          therapistName: `${appointment.therapist.firstName} ${appointment.therapist.lastName}`,
          treatmentType: appointment.treatmentType || '',
          duration: String(appointment.duration || 60),
          portalUrl: `${appUrl}/dashboard/appointments`,
        },
        plainMessage: plainMsg,
        plainMessagePt: plainMsgPt,
      });
    } catch (emailError) {
      console.error('Failed to send appointment update notification:', emailError);
    }

    // Dedicated admin alert (activity 37) — only when the PATIENT cancelled
    // themselves. An admin/therapist cancelling doesn't need to be told
    // about their own action; this route handles both actors on the same
    // status field, so userRole is what tells them apart. Recomputes
    // date/time fresh rather than reaching into the try block above (whose
    // locals are scoped to it and a failure there shouldn't suppress this).
    if (body?.status === "CANCELLED" && userRole === "PATIENT") {
      (async () => {
        const { sendAdminAlert } = await import("@/lib/admin-alert-email");
        const { escapeHtml } = await import("@/lib/admin-notify-email");
        const appUrl2 = process.env.NEXTAUTH_URL || "https://bpr.clinic";
        const apptDate2 = new Date(appointment.dateTime);
        const dateStr2 = apptDate2.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const timeStr2 = apptDate2.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
        return sendAdminAlert({
          clinicId: (appointment as any).clinicId ?? null,
          subject: `❌ Appointment Cancelled by Patient: ${patientName}`,
          title: "Appointment Cancelled",
          intro: `<strong>${escapeHtml(patientName)}</strong> cancelled their own appointment.`,
          rows: [
            { label: "Was scheduled", value: `${dateStr2} at ${timeStr2}` },
            { label: "Treatment", value: appointment.treatmentType || "—" },
          ],
          ctaUrl: `${appUrl2}/admin/patients/${appointment.patient.id}`,
        });
      })().catch((err) => console.error("[appointments] admin cancellation alert error:", err));
    }

    if (body?.status === "CANCELLED") {
      notifyWaitlistForCancelledAppointment({
        id: appointment.id,
        clinicId: (appointment as any).clinicId ?? null,
        therapistId: appointment.therapist.id,
        treatmentType: appointment.treatmentType,
        dateTime: appointment.dateTime,
      }).catch(err => console.error("[appointments] waitlist notify error:", err));
    }

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdate(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await resolveActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;

    // Only therapists and admins can delete appointments
    if (actor.role === "PATIENT") {
      return NextResponse.json(
        { error: "Patients cannot delete appointments" },
        { status: 403 }
      );
    }

    try {
      await assertAppointmentAccess(actor, id);
    } catch (err) {
      return accessErrorResponse(err);
    }

    // Qual pacote pagou por ela, antes de a linha sumir: depois do `delete`
    // não há como saber qual contador reajustar.
    const apagada = await prisma.appointment.findUnique({
      where: { id },
      select: { patientPackageId: true },
    });

    await prisma.appointment.delete({
      where: { id },
    });

    // A razão de `syncSessionsUsed` recontar em vez de somar está escrita em
    // `lib/package-sessions.ts` e cita exatamente este caso: "neste sistema
    // linhas somem por fora (a clínica apaga uma consulta)". Faltava chamar
    // justamente aqui (QA de 25/09, falha 6).
    if (apagada?.patientPackageId) {
      await syncSessionsUsed(apagada.patientPackageId).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }
}
