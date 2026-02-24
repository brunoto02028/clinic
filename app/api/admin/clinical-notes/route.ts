import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_SOAP_NOTES, devFallbackResponse } from "@/lib/dev-fallback";

export async function GET() {
  try {
    const { clinicId, userRole } = await getClinicContext();

    if (
      !userRole ||
      (userRole !== "ADMIN" && userRole !== "THERAPIST" && userRole !== "SUPERADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const notes = await prisma.sOAPNote.findMany({
      where: withClinicFilter({}, clinicId),
      include: {
        patient: {
          select: { firstName: true, lastName: true },
        },
        therapist: {
          select: { firstName: true, lastName: true },
        },
        appointment: {
          select: { dateTime: true, treatmentType: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching clinical notes:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_SOAP_NOTES);
    }
    return NextResponse.json(
      { error: "Failed to fetch clinical notes" },
      { status: 500 }
    );
  }
}
