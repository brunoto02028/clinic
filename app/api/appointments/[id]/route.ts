export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

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

    // Check access
    if (
      userRole === "PATIENT" &&
      appointment.patientId !== userId
    ) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const userRole = (session.user as any).role;

    // Only therapists and admins can update appointments
    if (userRole === "PATIENT") {
      // Patients can only cancel their appointments
      if (body?.status && body.status !== "CANCELLED") {
        return NextResponse.json(
          { error: "Patients can only cancel appointments" },
          { status: 403 }
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
      await notifyPatient({
        patientId: appointment.patient.id,
        emailTemplateSlug: slug,
        emailVars: {
          patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          appointmentDate: dateStr,
          appointmentTime: timeStr,
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const userRole = (session.user as any).role;

    // Only therapists and admins can delete appointments
    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Patients cannot delete appointments" },
        { status: 403 }
      );
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
