export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET: Fetch available time slots for a given date
// Query params: date (YYYY-MM-DD), therapistId (optional), duration (minutes, default 60)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const dateStr = request.nextUrl.searchParams.get("date");
    const therapistId = request.nextUrl.searchParams.get("therapistId");
    const duration = parseInt(request.nextUrl.searchParams.get("duration") || "60", 10);

    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.

    // Find therapist — if not specified, find the first available
    let targetTherapistId = therapistId;
    if (!targetTherapistId) {
      const therapist = await prisma.user.findFirst({
        where: { role: { in: ["ADMIN", "THERAPIST", "SUPERADMIN"] } },
      });
      if (!therapist) {
        return NextResponse.json({ error: "No therapist available" }, { status: 400 });
      }
      targetTherapistId = therapist.id;
    }

    // Get therapist availability for this day of week
    const availability = await prisma.therapistAvailability.findUnique({
      where: {
        therapistId_dayOfWeek: {
          therapistId: targetTherapistId,
          dayOfWeek,
        },
      },
    });

    // If no availability record or not available, return empty
    if (!availability || !availability.isAvailable) {
      return NextResponse.json({ slots: [], available: false, reason: "not_working" });
    }

    // Generate time slots based on availability window
    const [startH, startM] = availability.startTime.split(":").map(Number);
    const [endH, endM] = availability.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Read configurable slot interval from SystemConfig
    const intervalConfig = await prisma.systemConfig.findUnique({ where: { key: "SLOT_INTERVAL_MINUTES" } });
    const slotInterval = intervalConfig ? parseInt(intervalConfig.value, 10) : 30;
    const allSlots: string[] = [];

    for (let m = startMinutes; m + duration <= endMinutes; m += slotInterval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      allSlots.push(`${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    }

    // Get existing appointments for this date to exclude booked slots
    const dayStart = new Date(dateStr + "T00:00:00");
    const dayEnd = new Date(dateStr + "T23:59:59");

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        therapistId: targetTherapistId,
        dateTime: { gte: dayStart, lte: dayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { dateTime: true, duration: true },
    });

    // Build set of occupied time ranges
    const occupiedRanges = existingAppointments.map((a) => {
      const apptStart = a.dateTime.getHours() * 60 + a.dateTime.getMinutes();
      const apptEnd = apptStart + (a.duration || 60);
      return { start: apptStart, end: apptEnd };
    });

    // Filter out slots that overlap with existing appointments
    const availableSlots = allSlots.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = slotStart + duration;

      return !occupiedRanges.some(
        (range) => slotStart < range.end && slotEnd > range.start
      );
    });

    return NextResponse.json({
      slots: availableSlots,
      available: true,
      workingHours: { start: availability.startTime, end: availability.endTime },
      therapistId: targetTherapistId,
    });
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
