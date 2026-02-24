import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinics: any[] = await (prisma.clinic as any).findMany({
      include: {
        _count: {
          select: {
            users: true,
            appointments: true,
            soapNotes: true,
            footScans: true,
            treatmentTypes: true,
          },
        },
        subscription: {
          select: { plan: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get patient counts per clinic
    const clinicStats = await Promise.all(
      clinics.map(async (clinic) => {
        const patientCount = await prisma.user.count({
          where: { clinicId: clinic.id, role: "PATIENT" },
        });
        const therapistCount = await prisma.user.count({
          where: { clinicId: clinic.id, role: { in: ["ADMIN", "THERAPIST"] } },
        });
        const pendingAppointments = await prisma.appointment.count({
          where: { clinicId: clinic.id, status: { in: ["PENDING", "CONFIRMED"] } },
        });
        const completedAppointments = await prisma.appointment.count({
          where: { clinicId: clinic.id, status: "COMPLETED" },
        });

        return {
          id: clinic.id,
          name: clinic.name,
          slug: clinic.slug,
          email: clinic.email,
          phone: clinic.phone,
          address: clinic.address,
          city: clinic.city,
          postcode: clinic.postcode,
          country: clinic.country,
          isActive: clinic.isActive,
          createdAt: clinic.createdAt,
          subscription: clinic.subscription,
          moduleAccess: clinic.moduleAccess,
          stats: {
            totalUsers: clinic._count.users,
            patients: patientCount,
            therapists: therapistCount,
            totalAppointments: clinic._count.appointments,
            pendingAppointments,
            completedAppointments,
            clinicalNotes: clinic._count.soapNotes,
            footScans: clinic._count.footScans,
            treatmentTypes: clinic._count.treatmentTypes,
          },
        };
      })
    );

    // Global totals
    const globalStats = {
      totalClinics: clinics.length,
      activeClinics: clinics.filter((c) => c.isActive).length,
      totalPatients: clinicStats.reduce((s, c) => s + c.stats.patients, 0),
      totalAppointments: clinicStats.reduce((s, c) => s + c.stats.totalAppointments, 0),
      totalTherapists: clinicStats.reduce((s, c) => s + c.stats.therapists, 0),
    };

    return NextResponse.json({ clinics: clinicStats, globalStats });
  } catch (error: any) {
    console.error("Error fetching global dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard" }, { status: 500 });
  }
}
