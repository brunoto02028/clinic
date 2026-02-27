import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_APPOINTMENTS, devFallbackResponse } from "@/lib/dev-fallback";
import { notifyPatient } from "@/lib/notify-patient";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const { clinicId, userRole } = await getClinicContext();

    if (
      !userRole ||
      (userRole !== "ADMIN" && userRole !== "THERAPIST" && userRole !== "SUPERADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const appointments = await prisma.appointment.findMany({
      where: withClinicFilter({}, clinicId),
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { dateTime: "desc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_APPOINTMENTS);
    }
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId, userRole, userId } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!clinicId) {
      return NextResponse.json({ error: "No clinic selected" }, { status: 400 });
    }

    const body = await request.json();
    const {
      patientId, dateTime, duration, treatmentType, notes, price,
      mode, videoRoomId, videoRoomUrl, treatmentPlanId, paymentMode,
    } = body;

    if (!patientId || !dateTime) {
      return NextResponse.json({ error: "Patient and date/time are required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        patientId,
        therapistId: userId!,
        dateTime: new Date(dateTime),
        duration: duration || 60,
        treatmentType: treatmentType || "General Consultation",
        notes: notes || null,
        price: price || 0,
        mode: mode || "IN_PERSON",
        videoRoomId: videoRoomId || null,
        videoRoomUrl: videoRoomUrl || null,
        treatmentPlanId: treatmentPlanId || null,
      } as any,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Create Stripe checkout if online payment requested
    let checkoutUrl: string | null = null;
    if (paymentMode === "online" && price > 0) {
      try {
        const appUrl = process.env.NEXTAUTH_URL || '';
        const apptDate = new Date(dateTime);
        const dateStr = apptDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = apptDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        // Create payment record
        const payment = await prisma.payment.create({
          data: {
            appointmentId: appointment.id,
            userId: patientId,
            amount: price,
            currency: "GBP",
            status: "PENDING",
          },
        });

        // Create Stripe checkout session
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          mode: "payment",
          customer_email: appointment.patient.email ?? undefined,
          line_items: [
            {
              price_data: {
                currency: "gbp",
                product_data: {
                  name: treatmentType || "Consultation",
                  description: `Appointment on ${dateStr} at ${timeStr}`,
                },
                unit_amount: Math.round(price * 100),
              },
              quantity: 1,
            },
          ],
          metadata: {
            appointmentId: appointment.id,
            paymentId: payment.id,
            userId: patientId,
            type: "appointment",
          },
          success_url: `${appUrl}/dashboard/appointments?payment=success`,
          cancel_url: `${appUrl}/dashboard/appointments?payment=cancelled`,
        });

        checkoutUrl = checkoutSession.url;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripeSessionId: checkoutSession.id },
        });
      } catch (stripeErr) {
        console.error('Failed to create Stripe checkout:', stripeErr);
      }
    }

    // Send APPOINTMENT_CONFIRMATION email to patient
    try {
      const appUrl = process.env.NEXTAUTH_URL || '';
      const apptDate = new Date(dateTime);
      const dateStr = apptDate.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = apptDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      const paymentNote = paymentMode === "online" && checkoutUrl
        ? `\n\nPayment required online: ${checkoutUrl}`
        : paymentMode === "in_person"
          ? `\n\nPayment: £${(price || 0).toFixed(2)} — payable at the clinic.`
          : '';
      const paymentNotePt = paymentMode === "online" && checkoutUrl
        ? `\n\nPagamento online obrigatório: ${checkoutUrl}`
        : paymentMode === "in_person"
          ? `\n\nPagamento: £${(price || 0).toFixed(2)} — pagar na clínica.`
          : '';

      await notifyPatient({
        patientId: appointment.patient.id,
        emailTemplateSlug: 'APPOINTMENT_CONFIRMATION',
        emailVars: {
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
          therapistName: `${appointment.therapist.firstName} ${appointment.therapist.lastName}`,
          treatmentType: treatmentType || 'General Consultation',
          duration: String(duration || 60),
          price: `£${(price || 0).toFixed(2)}`,
          paymentLink: checkoutUrl || '',
          portalUrl: `${appUrl}/dashboard/appointments`,
        },
        plainMessage: `Your appointment is confirmed: ${treatmentType || 'Consultation'} on ${dateStr} at ${timeStr} with ${appointment.therapist.firstName}. Duration: ${duration || 60} min.${paymentNote}`,
        plainMessagePt: `Sua consulta está confirmada: ${treatmentType || 'Consulta'} em ${dateStr} às ${timeStr} com ${appointment.therapist.firstName}. Duração: ${duration || 60} min.${paymentNotePt}`,
      });
    } catch (emailErr) {
      console.error('Failed to send appointment confirmation email:', emailErr);
    }

    return NextResponse.json({ ...appointment, checkoutUrl });
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
