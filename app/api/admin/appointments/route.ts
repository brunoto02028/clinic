import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_APPOINTMENTS, devFallbackResponse } from "@/lib/dev-fallback";

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

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
