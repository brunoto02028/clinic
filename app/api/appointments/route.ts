export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";
import { pushConsulta } from "@/lib/push-notify";
import { isDbUnreachableError, MOCK_APPOINTMENTS, devFallbackResponse } from "@/lib/dev-fallback";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { getActor, assertPatientAccess, accessErrorResponse } from "@/lib/tenant-access";
import { appointmentTenantWhere, findTherapist } from "@/lib/appointment-access";
import { logBookedEventForEmail } from "@/lib/lead-magnet";
import { patientBookingPrice } from "@/lib/service-price";
import { bookingOptionsFor } from "@/lib/booking-options";
import { slotsForDate, hasConfiguredSchedule } from "@/lib/schedule";
import { getZonedDateString, getZonedMinutesOfDay } from "@/lib/clinic-timezone";
import { syncSessionsUsed } from "@/lib/package-sessions";
import { isPersonalTenant } from "@/lib/tenant-type";

export async function GET(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();

    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const userRole = effectiveUser.role;

    const status = request.nextUrl.searchParams.get("status");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    let whereClause: any = {};

    if (userRole === "PATIENT") {
      whereClause.patientId = userId;
    } else {
      // Staff see their own appointments or, with viewAll, every appointment
      // of their tenant — never another tenant's.
      const viewAll = request.nextUrl.searchParams.get("viewAll");
      if (viewAll !== "true") {
        whereClause.therapistId = userId;
      } else {
        const actor = await getActor(request);
        if (!actor?.clinicId) {
          return NextResponse.json({ error: "No tenant resolved for this account" }, { status: 403 });
        }
        Object.assign(whereClause, appointmentTenantWhere(actor.clinicId));
      }
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.dateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
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
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
        soapNote: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        dateTime: "asc",
      },
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse({ appointments: MOCK_APPOINTMENTS });
    }
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticated through getActor, not getServerSession. The session
    // gate that stood here accepted only the web's cookie, so every booking
    // from the mobile app answered 401 — the app has never been able to book,
    // in production included, since this route's first commit. getActor goes
    // through getEffectiveUser, which accepts the bearer token as well, and is
    // strictly stronger besides: it re-reads the user and refuses an inactive
    // account, which the session check did not. The GET above already worked
    // from the app for exactly this reason.
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const { dateTime, duration, treatmentType, notes, therapistId, price, paymentMethod } = body ?? {};

    if (!dateTime || !treatmentType) {
      return NextResponse.json(
        { error: "Date, time, and treatment type are required" },
        { status: 400 }
      );
    }

    // Defaults to ONLINE — preserves current behaviour for callers that don't
    // send this (e.g. staff booking on a patient's behalf), see activity 50.
    if (paymentMethod !== undefined && paymentMethod !== "ONLINE" && paymentMethod !== "IN_PERSON") {
      return NextResponse.json({ error: "Invalid paymentMethod" }, { status: 400 });
    }

    if (!actor.clinicId) {
      return NextResponse.json({ error: "This account is not linked to a clinic" }, { status: 409 });
    }
    const isPatient = actor.role === "PATIENT";

    // A personal studio's sessions are paid in person: online payment would
    // charge BPR's Stripe account, not the trainer's (activity 52, T-7).
    const tenant = await prisma.clinic.findUnique({ where: { id: actor.clinicId }, select: { type: true } });
    const resolvedPaymentMethod: "ONLINE" | "IN_PERSON" =
      isPersonalTenant(tenant?.type) || paymentMethod === "IN_PERSON" ? "IN_PERSON" : "ONLINE";

    // Patients book for themselves; staff name the patient, who must belong to
    // their tenant.
    let patientId = actor.userId;
    if (!isPatient) {
      if (!body?.patientId) {
        return NextResponse.json(
          { error: "Patient ID is required" },
          { status: 400 }
        );
      }
      try {
        await assertPatientAccess(actor, body.patientId);
      } catch (err) {
        return accessErrorResponse(err);
      }
      patientId = body.patientId;
    }

    // The therapist is always a member of that same tenant: a patient may only
    // pick someone who sees patients; staff default to themselves.
    const therapist = await findTherapist(
      actor.clinicId,
      therapistId || (isPatient ? null : actor.userId),
      isPatient
    );
    if (!therapist) {
      return NextResponse.json(
        { error: "No therapist available" },
        { status: therapistId ? 404 : 400 }
      );
    }
    const selectedTherapistId = therapist.id;

    // A patient never sets their own price — it's the tenant's consultation
    // price, the same figure the booking form shows (activity 52, T-4). Staff
    // booking on a patient's behalf may still set one.
    const staffPriceNum = price === undefined || price === null || price === "" ? NaN : Number(price);
    const staffPrice = Number.isFinite(staffPriceNum) && staffPriceNum >= 0 ? staffPriceNum : null;

    // Qual porta o paciente está atravessando: primeira consulta, sessão do
    // pacote que ele já comprou, ou sessão extra. É o servidor que decide, pela
    // mesma função que responde à tela — a tela prometendo um preço e o
    // servidor cobrando outro é o defeito que isto impede (atividade 080).
    const opcao = isPatient ? await bookingOptionsFor(patientId) : null;
    if (opcao && !opcao.kind) {
      return NextResponse.json(
        {
          error:
            opcao.blockedReason === "screening_required"
              ? "Complete your medical screening before booking."
              : "This account is not linked to a clinic",
          errorPt:
            opcao.blockedReason === "screening_required"
              ? "Preencha sua triagem antes de marcar."
              : "Esta conta não está ligada a uma clínica",
          code: opcao.blockedReason,
        },
        { status: 409 }
      );
    }

    // O horário escolhido tem de ser um dos que o servidor ofereceu. Sem isto,
    // a capacidade e a janela viviam só na tela: um POST direto marcava a
    // quinta pessoa num horário de quatro, ou um domingo às 03:00. A clínica
    // continua podendo marcar fora — ela é quem abre exceção, e sabe que está
    // abrindo (QA de 25/09).
    // Data e hora **da clínica**, derivadas do instante que chegou. Ler
      // `getHours()` daria a hora do servidor, e em produção ele está em UTC:
      // o horário legítimo era recusado e um fora da janela, aceito
      // (QA de 25/09, N1).
    const quando = new Date(dateTime);
    const diaDaClinica = getZonedDateString(quando);
    const minutosDaClinica = getZonedMinutesOfDay(quando);
    const hora = `${String(Math.floor(minutosDaClinica / 60)).padStart(2, "0")}:${String(minutosDaClinica % 60).padStart(2, "0")}`;

    if (opcao?.kind && (await hasConfiguredSchedule(actor.clinicId, selectedTherapistId, diaDaClinica))) {
      const oferecidos = await slotsForDate(actor.clinicId, selectedTherapistId, diaDaClinica, {
        kind: opcao.kind === "FIRST_CONSULTATION" ? "CONSULTATION" : "TREATMENT",
      });

      if (!oferecidos.some((s) => s.time === hora)) {
        return NextResponse.json(
          {
            error: "That time is no longer available.",
            errorPt: "Esse horário não está mais disponível.",
            code: "slot_unavailable",
          },
          { status: 409 }
        );
      }
    }

    const resolvedPrice = !isPatient && staffPrice !== null
      ? staffPrice
      : opcao
        ? opcao.price
        : await patientBookingPrice(actor.clinicId);

    const appointment = await prisma.appointment.create({
      data: {
        clinicId: actor.clinicId,
        patientId,
        therapistId: selectedTherapistId,
        dateTime: new Date(dateTime),
        duration: duration || 60,
        // O tipo também é do servidor quando quem marca é o paciente: o
        // `price` já era ignorado, e deixar o rótulo passar seria a mesma
        // porta, mais estreita (QA de 25/09, falha 9).
        treatmentType: opcao
          ? opcao.kind === "FIRST_CONSULTATION"
            ? "Initial Consultation"
            : "Treatment Session"
          : treatmentType,
        notes: notes || null,
        price: resolvedPrice,
        // A sessão do pacote não gera cobrança: ela já foi paga quando o
        // paciente comprou o pacote. E `paymentMethod` do corpo não decide
        // nada quando quem marca é o paciente — nem para exigir pagamento,
        // nem para dispensá-lo. A sessão faturada é `IN_PERSON` porque não há
        // Checkout nenhum para ela: nascia `ONLINE` e `PENDING`, esperando um
        // webhook que nunca vinha (QA de 25/09, N5).
        paymentMethod: opcao
          ? opcao.kind === "PACKAGE_SESSION"
            ? "IN_PERSON"
            : opcao.requiresPayment
              ? "ONLINE"
              : "IN_PERSON"
          : resolvedPaymentMethod,
        kind: opcao ? opcao.kind : "CLINIC_BOOKED",
        // O vínculo é o que permite devolver a sessão no cancelamento. Um
        // contador solto não sabe qual consulta gastou qual sessão.
        patientPackageId: opcao?.kind === "PACKAGE_SESSION" ? opcao.patientPackageId : null,
        // Quem exige pagamento nasce **pendente**, e nada que venha do corpo
        // muda isso: `paymentMethod: "IN_PERSON"` mandado pelo paciente numa
        // primeira consulta confirmava o horário sem cobrança nenhuma
        // (QA de 25/09, falha 8). Quem confirma é o webhook.
        // Quem marca pelo app: pendente só quando há pagamento a fazer. A
        // sessão extra faturada fica confirmada — a cobrança entra na fatura,
        // e deixá-la pendente à espera de um webhook inexistente era um
        // horário preso para sempre.
        status: opcao
          ? opcao.requiresPayment
            ? "PENDING"
            : "CONFIRMED"
          : resolvedPaymentMethod === "IN_PERSON"
            ? "CONFIRMED"
            : "PENDING",
      },
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

    // Lead-magnet attribution (P3): log a "booked" event if this patient's
    // email was previously captured via an article lead-magnet.
    logBookedEventForEmail(appointment.patient.email).catch(() => {});

    // O contador do pacote volta a bater com a realidade. Recontado, não
    // somado: um `increment` erra para sempre no dia em que uma linha some por
    // fora, e neste sistema a clínica apaga consulta.
    if (appointment.patientPackageId) {
      await syncSessionsUsed(appointment.patientPackageId).catch(() => {});
    }

    // O toque no ombro — **só quando quem marcou foi a clínica**. Paciente que
    // acabou de marcar a própria consulta na tela não precisa que o celular
    // dele vibre contando o que ele mesmo fez (077, T-5).
    if (!isPatient) {
      await pushConsulta(appointment.patient.id, "marcada");
    }

    // Send confirmation to patient via their preferred channel
    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      const apptDate = new Date(dateTime);
      const dateStr = apptDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = apptDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      await notifyPatient({
        patientId: appointment.patient.id,
        emailTemplateSlug: 'APPOINTMENT_CONFIRMATION',
        emailVars: {
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          therapistName: `${appointment.therapist.firstName} ${appointment.therapist.lastName}`,
          treatmentType: treatmentType || 'Consultation',
          duration: String(duration || 60),
          portalUrl: `${appUrl}/dashboard/appointments/${appointment.id}`,
        },
        plainMessage: resolvedPaymentMethod === "IN_PERSON"
          ? `Your appointment is confirmed: ${dateStr} at ${timeStr} with ${appointment.therapist.firstName}. Pay at the clinic on the day. Details: ${appUrl}/dashboard/appointments/${appointment.id}`
          : `Your appointment request has been received: ${dateStr} at ${timeStr} with ${appointment.therapist.firstName}. View details and pay at: ${appUrl}/dashboard/appointments/${appointment.id}`,
        plainMessagePt: resolvedPaymentMethod === "IN_PERSON"
          ? `A sua consulta está confirmada: ${dateStr} às ${timeStr} com ${appointment.therapist.firstName}. Pague na clínica no dia. Detalhes: ${appUrl}/dashboard/appointments/${appointment.id}`
          : `O seu pedido de consulta foi recebido: ${dateStr} às ${timeStr} com ${appointment.therapist.firstName}. Veja os detalhes em: ${appUrl}/dashboard/appointments/${appointment.id}`,
      });
    } catch (emailError) {
      console.error('Failed to send patient notification:', emailError);
    }

    // Send notification to admin about new appointment
    try {
      const appName = getAppName();
      const senderEmail = getSenderEmail();
      const appUrl = process.env.NEXTAUTH_URL || "";

      const adminHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #607d7d; border-bottom: 2px solid #5dc9c0; padding-bottom: 10px;">
            New Appointment Scheduled
          </h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Patient:</strong> ${appointment.patient.firstName} ${appointment.patient.lastName}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${appointment.patient.email}">${appointment.patient.email}</a></p>
            <p style="margin: 10px 0;"><strong>Therapist:</strong> ${appointment.therapist.firstName} ${appointment.therapist.lastName}</p>
            <p style="margin: 10px 0;"><strong>Treatment:</strong> ${treatmentType}</p>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${new Date(dateTime).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</p>
            <p style="margin: 10px 0;"><strong>Duration:</strong> ${duration || 60} minutes</p>
            <p style="margin: 10px 0;"><strong>Price:</strong> £${price || 60}</p>
            <p style="margin: 10px 0;"><strong>Payment:</strong> ${resolvedPaymentMethod === "IN_PERSON" ? "Pay in person" : "Online"}</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> ${appointment.status}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/admin/appointments" style="background: #5dc9c0; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View in Admin Panel
            </a>
          </div>
        </div>
      `;

      const { getAdminNotificationEmail } = await import("@/lib/admin-notify-email");
      await sendEmail({
        to: await getAdminNotificationEmail(actor.clinicId),
        subject: `New Appointment: ${appointment.patient.firstName} ${appointment.patient.lastName} - ${new Date(dateTime).toLocaleDateString("en-GB")}`,
        html: adminHtmlBody,
      });
    } catch (emailError) {
      console.error("Failed to send admin email notification:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Appointment booked successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
