export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { pushConsulta } from "@/lib/push-notify";
import { syncSessionsUsed } from "@/lib/package-sessions";
import { notifyWaitlistForCancelledAppointment } from "@/lib/waitlist";
import { escapeHtml } from "@/lib/admin-notify-email";
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
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ appointment });
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
    if (body?.price) updateData.price = body.price;

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

    // Idem: o cancelamento feito pelo próprio paciente não vira notificação
    // para ele. `userRole` é o mesmo que decide, acima, o que ele pode mudar.
    if (userRole !== "PATIENT") {
      await pushConsulta(
        appointment.patient.id,
        body?.status === "CANCELLED" ? "cancelada" : "remarcada"
      );
    }

    // Send notification to patient about update/cancellation via preferred channel
    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      const apptDate = new Date(appointment.dateTime);
      const dateStr = apptDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = apptDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const isCancellation = body?.status === 'CANCELLED';
      const slug = isCancellation ? 'APPOINTMENT_CANCELLED' : 'APPOINTMENT_CONFIRMATION';
      const plainMsg = isCancellation
        ? `Your appointment on ${dateStr} at ${timeStr} has been cancelled.`
        : `Your appointment has been updated: ${appointment.treatmentType} on ${dateStr} at ${timeStr}.`;
      const plainMsgPt = isCancellation
        ? `Sua consulta em ${dateStr} às ${timeStr} foi cancelada.`
        : `Sua consulta foi atualizada: ${appointment.treatmentType} em ${dateStr} às ${timeStr}.`;

      // Location: the confirmation email used to have no way to say "the
      // therapist is coming to you" — a home-visit note (see the appointment
      // Notes field) got no reflection in what the patient actually reads,
      // and "arrive 5 minutes early" was flatly wrong for that case. Detected
      // from the notes text rather than a new field, since there's nowhere
      // else this is recorded today.
      const isHomeVisit = /domicil|home[\s-]?visit|casa da paciente|patient'?s home/i.test(appointment.notes || '');
      let location = '';
      if (isHomeVisit) {
        location = 'Home visit / Visita domiciliar';
      } else {
        const clinic = await prisma.clinic.findUnique({
          where: { id: (appointment as any).clinicId },
          select: { name: true, address: true, city: true },
        });
        const addr = [clinic?.address, clinic?.city].filter(Boolean).join(', ');
        location = clinic?.name ? `${clinic.name}${addr ? ' — ' + addr : ''}` : 'BPR Physical Rehabilitation';
      }

      // Surfaces any admin-written note (e.g. the home-visit detail above)
      // directly in the email instead of leaving it invisible to the patient.
      const notesBlockHtml = appointment.notes
        ? `<p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 16px;background:#F5F4F1;border-radius:8px;padding:10px 14px;"><strong>Note:</strong> ${escapeHtml(appointment.notes)}</p>`
        : '';
      const notesBlockHtmlPt = appointment.notes
        ? `<p style="color:#374151;font-size:13px;line-height:1.6;margin:0 0 16px;background:#F5F4F1;border-radius:8px;padding:10px 14px;"><strong>Nota:</strong> ${escapeHtml(appointment.notes)}</p>`
        : '';

      await notifyPatient({
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

    await prisma.appointment.delete({
      where: { id },
    });

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
