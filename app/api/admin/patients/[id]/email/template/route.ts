export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guardEmailAccess } from "@/lib/patient-email-server";
import { confirmationTemplate, looksLikeHomeVisit } from "@/lib/patient-email";

// GET ?appointmentId=…&kind=home|clinic — prefilled confirmation text (nothing is sent)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const g = await guardEmailAccess(request, params.id);
    if (g.response) return g.response;

    const url = new URL(request.url);
    const appointmentId = url.searchParams.get("appointmentId");
    if (!appointmentId) return NextResponse.json({ error: "appointmentId is required" }, { status: 400 });

    // Scoped by patient: another patient's appointment answers like a missing one.
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId: params.id },
      include: { therapist: { select: { firstName: true } } },
    });
    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    const kindParam = url.searchParams.get("kind");
    const kind = kindParam === "home" || kindParam === "clinic" ? kindParam : looksLikeHomeVisit(appointment) ? "home" : "clinic";

    const template = confirmationTemplate({
      kind,
      patientFirstName: g.patient.firstName,
      therapistFirstName: appointment.therapist.firstName,
      appointment: { dateTime: appointment.dateTime, duration: appointment.duration, treatmentType: appointment.treatmentType, price: appointment.price },
      address: kind === "home" ? g.patient.address : null,
    });
    return NextResponse.json({ kind, appointmentId: appointment.id, ...template });
  } catch (error) {
    console.error("[patient-email] template error:", error);
    return NextResponse.json({ error: "Failed to build the template" }, { status: 500 });
  }
}
