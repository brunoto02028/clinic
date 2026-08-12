export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isDbUnreachableError, MOCK_SOAP_NOTES, devFallbackResponse } from "@/lib/dev-fallback";
import { getEffectiveUser } from "@/lib/get-effective-user";

export async function GET(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();

    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const userRole = effectiveUser.role;
    const patientId = request.nextUrl.searchParams.get("patientId");

    let whereClause: any = {};

    if (userRole === "PATIENT") {
      whereClause.patientId = userId;
    } else if (patientId) {
      whereClause.patientId = patientId;
    }

    const soapNotes = await prisma.sOAPNote.findMany({
      where: whereClause,
      include: {
        appointment: {
          select: {
            dateTime: true,
            treatmentType: true,
          },
        },
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
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ soapNotes });
  } catch (error) {
    console.error("Error fetching SOAP notes:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse({ soapNotes: MOCK_SOAP_NOTES });
    }
    return NextResponse.json(
      { error: "Failed to fetch SOAP notes" },
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

    const userRole = (session.user as any).role;

    // Only therapists and admins can create SOAP notes
    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Only therapists can create clinical notes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      appointmentId,
      patientId,
      subjective,
      objective,
      assessment,
      plan,
      painLevel,
      rangeOfMotion,
      functionalTests,
    } = body ?? {};

    // patientId is required, appointmentId is optional
    if (!patientId || !subjective || !objective || !assessment || !plan) {
      return NextResponse.json(
        { error: "Patient ID and all SOAP note fields are required" },
        { status: 400 }
      );
    }

    const therapistId = (session.user as any).id;

    // If appointmentId is provided, check if SOAP note already exists
    if (appointmentId) {
      const existingNote = await prisma.sOAPNote.findUnique({
        where: { appointmentId },
      });

      if (existingNote) {
        return NextResponse.json(
          { error: "A clinical note already exists for this appointment" },
          { status: 409 }
        );
      }
    }

    // Resolve clinicId from the patient record so the note is tenant-scoped
    const patientRec = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });

    const soapNote = await prisma.sOAPNote.create({
      data: {
        appointmentId: appointmentId || null,
        clinicId: patientRec?.clinicId || null,
        patientId,
        therapistId,
        subjective,
        objective,
        assessment,
        plan,
        painLevel: painLevel ?? null,
        rangeOfMotion: rangeOfMotion ?? null,
        functionalTests: functionalTests ?? null,
      },
      include: {
        appointment: {
          select: {
            dateTime: true,
            treatmentType: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        therapist: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update appointment status to completed if linked
    if (appointmentId) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Clinical note created successfully",
      soapNote,
    });
  } catch (error) {
    console.error("Error creating SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to create clinical note" },
      { status: 500 }
    );
  }
}
