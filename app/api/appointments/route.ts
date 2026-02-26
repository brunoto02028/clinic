export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getAppName, getSenderEmail } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";
import { isDbUnreachableError, MOCK_APPOINTMENTS, devFallbackResponse } from "@/lib/dev-fallback";
import { getEffectiveUserId, isPreviewRequest } from "@/lib/preview-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = getEffectiveUserId(session, request);
    const userRole = (session.user as any).role;
    const isPreview = isPreviewRequest(session, request);

    const status = request.nextUrl.searchParams.get("status");
    const startDate = request.nextUrl.searchParams.get("startDate");
    const endDate = request.nextUrl.searchParams.get("endDate");

    let whereClause: any = {};

    if (userRole === "PATIENT" || isPreview) {
      whereClause.patientId = userId;
    } else {
      // Therapists and admins see all appointments or their assigned ones
      const viewAll = request.nextUrl.searchParams.get("viewAll");
      if (viewAll !== "true") {
        whereClause.therapistId = userId;
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const { dateTime, duration, treatmentType, notes, therapistId, price } = body ?? {};

    if (!dateTime || !treatmentType) {
      return NextResponse.json(
        { error: "Date, time, and treatment type are required" },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // If patient is booking, they are the patient
    // If therapist is booking, they need to specify patientId
    let patientId = userId;
    let selectedTherapistId = therapistId;

    if (userRole !== "PATIENT") {
      if (!body?.patientId) {
        return NextResponse.json(
          { error: "Patient ID is required" },
          { status: 400 }
        );
      }
      patientId = body.patientId;
      selectedTherapistId = therapistId || userId;
    } else {
      // Get a therapist if not specified
      if (!selectedTherapistId) {
        const therapist = await prisma.user.findFirst({
          where: {
            role: { in: ["ADMIN", "THERAPIST"] },
          },
        });
        if (!therapist) {
          return NextResponse.json(
            { error: "No therapist available" },
            { status: 400 }
          );
        }
        selectedTherapistId = therapist.id;
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        therapistId: selectedTherapistId,
        dateTime: new Date(dateTime),
        duration: duration || 60,
        treatmentType,
        notes: notes || null,
        price: price || 60,
        status: "PENDING",
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
          treatmentType: treatmentType || '',
          duration: String(duration || 60),
          portalUrl: `${appUrl}/dashboard/appointments`,
        },
        plainMessage: `Your appointment is confirmed: ${treatmentType} on ${dateStr} at ${timeStr} with ${appointment.therapist.firstName}. Duration: ${duration || 60} min.`,
        plainMessagePt: `Sua consulta está confirmada: ${treatmentType} em ${dateStr} às ${timeStr} com ${appointment.therapist.firstName}. Duração: ${duration || 60} min.`,
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
            <p style="margin: 10px 0;"><strong>Status:</strong> ${appointment.status}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/admin/appointments" style="background: #5dc9c0; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View in Admin Panel
            </a>
          </div>
        </div>
      `;

      await sendEmail({
        to: "brunotoaz@gmail.com",
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
