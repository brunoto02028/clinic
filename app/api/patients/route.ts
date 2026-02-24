export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { isDbUnreachableError, MOCK_PATIENTS, devFallbackResponse } from "@/lib/dev-fallback";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    const userClinicId = (session.user as any).clinicId;

    // Only therapists and admins can view patient list
    if (userRole === "PATIENT") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const searchQuery = request.nextUrl.searchParams.get("search");
    const clinicFilter = request.nextUrl.searchParams.get("clinicId");

    let whereClause: any = {
      role: "PATIENT",
    };

    // Filter by clinic: use query param if provided, otherwise use user's clinic
    const effectiveClinicId = clinicFilter || userClinicId;
    if (effectiveClinicId && userRole !== "SUPERADMIN") {
      whereClause.clinicId = effectiveClinicId;
    } else if (effectiveClinicId && userRole === "SUPERADMIN" && clinicFilter) {
      whereClause.clinicId = clinicFilter;
    }

    if (searchQuery) {
      whereClause.OR = [
        { firstName: { contains: searchQuery, mode: "insensitive" } },
        { lastName: { contains: searchQuery, mode: "insensitive" } },
        { email: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const patients = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        isActive: true,
        clinicId: true,
        medicalScreening: {
          select: {
            id: true,
            consentGiven: true,
          },
        },
        patientAppointments: {
          select: {
            id: true,
            dateTime: true,
            status: true,
          },
          orderBy: {
            dateTime: "desc",
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error("Error fetching patients:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse({ patients: MOCK_PATIENTS });
    }
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
