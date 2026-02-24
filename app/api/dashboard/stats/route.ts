export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    if (userRole === "PATIENT" || isPreview) {
      // Patient dashboard stats
      const upcomingAppointments = await prisma.appointment.count({
        where: {
          patientId: userId,
          dateTime: { gte: new Date() },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      const completedAppointments = await prisma.appointment.count({
        where: {
          patientId: userId,
          status: "COMPLETED",
        },
      });

      const clinicalNotes = await prisma.sOAPNote.count({
        where: {
          patientId: userId,
        },
      });

      const hasScreening = await prisma.medicalScreening.findUnique({
        where: { userId },
      });

      return NextResponse.json({
        upcomingAppointments,
        completedAppointments,
        clinicalNotes,
        screeningComplete: !!hasScreening?.consentGiven,
      });
    } else {
      // Therapist/Admin dashboard stats
      const todayAppointments = await prisma.appointment.count({
        where: {
          dateTime: {
            gte: today,
            lt: tomorrow,
          },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      const weekAppointments = await prisma.appointment.count({
        where: {
          dateTime: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
      });

      const totalPatients = await prisma.user.count({
        where: { role: "PATIENT" },
      });

      const pendingAppointments = await prisma.appointment.count({
        where: {
          status: "PENDING",
        },
      });

      const recentPatients = await prisma.user.findMany({
        where: { role: "PATIENT" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      const upcomingAppointmentsList = await prisma.appointment.findMany({
        where: {
          dateTime: { gte: new Date() },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { dateTime: "asc" },
        take: 5,
      });

      return NextResponse.json({
        todayAppointments,
        weekAppointments,
        totalPatients,
        pendingAppointments,
        recentPatients,
        upcomingAppointments: upcomingAppointmentsList,
      });
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
