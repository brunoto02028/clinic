export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { patientRecordAccess, staffPatientAccess } from "@/lib/staff-patient-access";

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

    const tenantAccess = await patientRecordAccess(request, id);
    if (tenantAccess.response) return tenantAccess.response;

    const patient = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        medicalScreening: true,
        patientAppointments: {
          include: {
            therapist: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            payment: {
              select: {
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
            dateTime: "desc",
          },
        },
        soapNotesFor: {
          include: {
            appointment: {
              select: {
                dateTime: true,
                treatmentType: true,
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
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const tenantAccess = await patientRecordAccess(request, id);
    if (tenantAccess.response) return tenantAccess.response;

    const updateData: any = {};

    if (body?.firstName) updateData.firstName = body.firstName;
    if (body?.lastName) updateData.lastName = body.lastName;
    if (body?.email) updateData.email = body.email;
    if (body?.phone !== undefined) updateData.phone = body.phone;

    const patient = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json(
      { error: "Failed to update patient" },
      { status: 500 }
    );
  }
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

    // Staff of this patient's tenant only — and, because the guard resolves
    // a patient, never a staff account or someone from another tenant.
    const tenantAccess = await staffPatientAccess(request, id);
    if (tenantAccess.response) return tenantAccess.response;

    // Only admins can delete patients
    if (tenantAccess.actor.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete patients" },
        { status: 403 }
      );
    }

    // Delete patient (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting patient:", error);
    return NextResponse.json(
      { error: "Failed to delete patient" },
      { status: 500 }
    );
  }
}
