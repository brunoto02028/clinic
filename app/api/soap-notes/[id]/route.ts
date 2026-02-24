export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

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

    const soapNote = await prisma.sOAPNote.findUnique({
      where: { id },
      include: {
        appointment: {
          select: {
            dateTime: true,
            treatmentType: true,
            duration: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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

    if (!soapNote) {
      return NextResponse.json(
        { error: "Clinical note not found" },
        { status: 404 }
      );
    }

    // Check access
    if (userRole === "PATIENT" && soapNote.patientId !== userId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({ soapNote });
  } catch (error) {
    console.error("Error fetching SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to fetch clinical note" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;

    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Only therapists can update clinical notes" },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    const soapNote = await prisma.sOAPNote.update({
      where: { id },
      data: {
        subjective: body.subjective,
        objective: body.objective,
        assessment: body.assessment,
        plan: body.plan,
        painLevel: body.painLevel ?? undefined,
        rangeOfMotion: body.rangeOfMotion ?? undefined,
        functionalTests: body.functionalTests ?? undefined,
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

    return NextResponse.json({
      success: true,
      message: "Clinical note updated successfully",
      soapNote,
    });
  } catch (error) {
    console.error("Error updating SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to update clinical note" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(request, { params });
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

    const userRole = (session.user as any).role;

    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Only therapists can delete clinical notes" },
        { status: 403 }
      );
    }

    const { id } = params;

    await prisma.sOAPNote.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Clinical note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting SOAP note:", error);
    return NextResponse.json(
      { error: "Failed to delete clinical note" },
      { status: 500 }
    );
  }
}
