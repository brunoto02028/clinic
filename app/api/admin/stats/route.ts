import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, withClinicFilter } from "@/lib/clinic-context";
import { isDbUnreachableError, MOCK_APPOINTMENTS, MOCK_PATIENTS, MOCK_FOOT_SCANS, devFallbackResponse } from "@/lib/dev-fallback";

export async function GET() {
  try {
    const { clinicId, userRole } = await getClinicContext();

    if (
      !userRole ||
      (userRole !== "ADMIN" && userRole !== "THERAPIST" && userRole !== "SUPERADMIN")
    ) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const [
      totalUsers,
      totalPatients,
      totalTherapists,
      appointments,
      soapNotes,
      articles,
      totalFootScans,
    ] = await Promise.all([
      prisma.user.count({ where: withClinicFilter({}, clinicId) }),
      prisma.user.count({ where: withClinicFilter({ role: "PATIENT" }, clinicId) as any }),
      prisma.user.count({ where: withClinicFilter({ role: "THERAPIST" }, clinicId) as any }),
      prisma.appointment.findMany({
        where: withClinicFilter({}, clinicId),
        orderBy: { dateTime: "desc" },
        take: 10,
        include: {
          patient: { select: { firstName: true, lastName: true, email: true } },
          therapist: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.sOAPNote.count({ where: withClinicFilter({}, clinicId) }),
      prisma.article.findMany({ where: withClinicFilter({}, clinicId) }),
      prisma.footScan.count({ where: withClinicFilter({}, clinicId) }),
    ]);

    // Batch 2: sequential to avoid pool exhaustion
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      confirmedAppointments,
      cancelledAppointments,
      todayAppointments,
      weekAppointments,
    ] = await Promise.all([
      prisma.appointment.count({ where: withClinicFilter({}, clinicId) }),
      prisma.appointment.count({ where: withClinicFilter({ status: "PENDING" }, clinicId) as any }),
      prisma.appointment.count({ where: withClinicFilter({ status: "COMPLETED" }, clinicId) as any }),
      prisma.appointment.count({ where: withClinicFilter({ status: "CONFIRMED" }, clinicId) as any }),
      prisma.appointment.count({ where: withClinicFilter({ status: "CANCELLED" }, clinicId) as any }),
      prisma.appointment.count({ where: withClinicFilter({ dateTime: { gte: todayStart, lte: todayEnd } }, clinicId) }),
      prisma.appointment.count({ where: withClinicFilter({ dateTime: { gte: weekStart, lte: weekEnd } }, clinicId) }),
    ]);

    const [recentPatients, clinic] = await Promise.all([
      prisma.user.findMany({
        where: withClinicFilter({ role: "PATIENT" }, clinicId) as any,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
      }),
      clinicId
        ? prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { id: true, name: true, slug: true, email: true, phone: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      // Overview
      totalUsers,
      totalPatients,
      totalTherapists,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      confirmedAppointments,
      cancelledAppointments,
      todayAppointments,
      weekAppointments,
      totalSoapNotes: soapNotes,
      totalArticles: articles.length,
      publishedArticles: articles.filter((a: any) => a.published).length,
      draftArticles: articles.filter((a: any) => !a.published).length,
      totalFootScans,
      // Lists
      recentAppointments: appointments.slice(0, 5),
      upcomingAppointments: appointments
        .filter((a: any) => new Date(a.dateTime) >= new Date() && a.status !== "CANCELLED")
        .slice(0, 5),
      recentPatients,
      // Clinic
      clinic,
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);

    if (isDbUnreachableError(error)) {
      return devFallbackResponse({
        totalUsers: 12,
        totalPatients: 8,
        totalTherapists: 2,
        totalAppointments: 45,
        pendingAppointments: 3,
        completedAppointments: 38,
        confirmedAppointments: 4,
        cancelledAppointments: 0,
        todayAppointments: 2,
        weekAppointments: 8,
        totalSoapNotes: 22,
        totalArticles: 5,
        publishedArticles: 3,
        draftArticles: 2,
        totalFootScans: 4,
        recentAppointments: MOCK_APPOINTMENTS.slice(0, 5),
        upcomingAppointments: MOCK_APPOINTMENTS.filter(a => a.status !== "COMPLETED").slice(0, 5),
        recentPatients: MOCK_PATIENTS.slice(0, 5).map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          createdAt: p.createdAt,
        })),
        clinic: {
          id: "dev-clinic-local",
          name: "Bruno Physical Rehabilitation",
          slug: "bruno-physical-rehabilitation",
          email: "admin@bpr.rehab",
          phone: "+44 7XXX XXXXXX",
          status: "ACTIVE",
          plan: "ENTERPRISE",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
