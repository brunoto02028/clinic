export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { getZonedDateString, getZonedMinutesOfDay, zonedTimeToUtc } from "@/lib/clinic-timezone";

// GET: Fetch available time slots for a given date
// Query params: date (YYYY-MM-DD), therapistId (optional), duration (minutes, default 60)
export async function GET(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const dateStr = request.nextUrl.searchParams.get("date");
    const therapistId = request.nextUrl.searchParams.get("therapistId");
    const duration = parseInt(request.nextUrl.searchParams.get("duration") || "60", 10);

    if (!dateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Anchor at noon UTC so the calendar date is unambiguous regardless of server timezone.
    const dayOfWeek = new Date(`${dateStr}T12:00:00.000Z`).getUTCDay(); // 0=Sunday, 1=Monday, etc.

    // Clinic's own midnight-to-midnight for this date, not the server's.
    const dayStart = zonedTimeToUtc(dateStr, "00:00");
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Find therapist — if not specified, fall back to whoever sees patients.
    // Role is not the test: the clinic owner and the developer both hold
    // SUPERADMIN, and this findFirst had no ordering, so it could just as
    // easily have returned the developer — who has no availability configured,
    // leaving the patient staring at a calendar with no slots.
    let targetTherapistId = therapistId;
    if (!targetTherapistId) {
      const therapist = await prisma.user.findFirst({
        where: { bookable: true, isActive: true },
        orderBy: { createdAt: "asc" },
      });
      if (!therapist) {
        return NextResponse.json({ error: "No therapist available" }, { status: 400 });
      }
      targetTherapistId = therapist.id;
    }

    // Blocked day (holiday, absence, training...) takes precedence over the weekly schedule
    const block = await (prisma as any).therapistBlock.findFirst({
      where: {
        therapistId: targetTherapistId,
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
    });
    if (block) {
      return NextResponse.json({ slots: [], available: false, reason: "blocked" });
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
      const apptStart = getZonedMinutesOfDay(a.dateTime);
      const apptEnd = apptStart + (a.duration || 60);
      return { start: apptStart, end: apptEnd };
    });

    // If the requested date is today (in the clinic's own timezone), drop slots
    // that have already started — otherwise a patient can "book" a consultation
    // that's already in the past. Compared against Europe/London, not the
    // server's or patient's own timezone, since that's what the slot times mean.
    const isToday = dateStr === getZonedDateString();
    const nowMinutes = getZonedMinutesOfDay();

    // Filter out slots that overlap with existing appointments or have already passed today
    const availableSlots = allSlots.filter((slot) => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = slotStart + duration;

      if (isToday && slotStart <= nowMinutes) return false;

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
