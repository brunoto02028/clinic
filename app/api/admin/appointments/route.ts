import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_APPOINTMENTS, devFallbackResponse } from "@/lib/dev-fallback";
import { notifyPatient } from "@/lib/notify-patient";

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
      mode, videoRoomId, videoRoomUrl, treatmentPlanId,
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

    // Send APPOINTMENT_CONFIRMATION email to patient
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
          treatmentType: treatmentType || 'General Consultation',
          duration: String(duration || 60),
          portalUrl: `${appUrl}/dashboard/appointments`,
        },
        plainMessage: `Your appointment is confirmed: ${treatmentType || 'Consultation'} on ${dateStr} at ${timeStr} with ${appointment.therapist.firstName}. Duration: ${duration || 60} min.`,
        plainMessagePt: `Sua consulta está confirmada: ${treatmentType || 'Consulta'} em ${dateStr} às ${timeStr} com ${appointment.therapist.firstName}. Duração: ${duration || 60} min.`,
      });
    } catch (emailErr) {
      console.error('Failed to send appointment confirmation email:', emailErr);
    }

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
