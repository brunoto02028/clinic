export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

const ADMIN_ROLES = ["ADMIN", "THERAPIST", "SUPERADMIN"];

// GET: Fetch therapist availability schedule
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const therapistId = request.nextUrl.searchParams.get("therapistId") || (session.user as any).id;

    const availability = await prisma.therapistAvailability.findMany({
      where: { therapistId },
      orderBy: { dayOfWeek: "asc" },
    });

    // Read slot interval setting
    const intervalConfig = await prisma.systemConfig.findUnique({ where: { key: "SLOT_INTERVAL_MINUTES" } });
    const slotInterval = intervalConfig ? parseInt(intervalConfig.value, 10) : 30;

    return NextResponse.json({ availability, slotInterval });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}

// PUT: Update therapist availability (upsert all 7 days)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await request.json();
    const { schedule, therapistId: reqTherapistId, slotInterval } = body;
    const therapistId = reqTherapistId || (session.user as any).id;

    if (!Array.isArray(schedule)) {
      return NextResponse.json({ error: "Invalid schedule format" }, { status: 400 });
    }

    // Upsert each day
    const results = await Promise.all(
      schedule.map((day: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }) =>
        prisma.therapistAvailability.upsert({
          where: {
            therapistId_dayOfWeek: {
              therapistId,
              dayOfWeek: day.dayOfWeek,
            },
          },
          update: {
            startTime: day.startTime,
            endTime: day.endTime,
            isAvailable: day.isAvailable,
          },
          create: {
            therapistId,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            isAvailable: day.isAvailable,
          },
        })
      )
    );

    // Save slot interval if provided
    if (slotInterval && (slotInterval === 30 || slotInterval === 60)) {
      await prisma.systemConfig.upsert({
        where: { key: "SLOT_INTERVAL_MINUTES" },
        update: { value: String(slotInterval) },
        create: {
          key: "SLOT_INTERVAL_MINUTES",
          value: String(slotInterval),
          label: "Booking Slot Interval (minutes)",
          description: "Slot interval in minutes for patient booking (30 or 60)",
          category: "other",
          isSecret: false,
        },
      });
    }

    return NextResponse.json({ success: true, availability: results });
  } catch (error) {
    console.error("Error updating availability:", error);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
