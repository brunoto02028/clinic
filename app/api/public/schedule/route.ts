export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// Public endpoint — returns the clinic's weekly opening hours (no auth required)
export async function GET() {
  try {
    // The clinic's opening hours come from whoever actually sees patients.
    // Selecting by role happened to land on the right person only because the
    // owner's account is the oldest — a staff account created before his would
    // have published someone else's hours on the public site.
    const therapist = await prisma.user.findFirst({
      where: { bookable: true, isActive: true },
      orderBy: { createdAt: "asc" },
    });

    if (!therapist) {
      return NextResponse.json({ schedule: [] });
    }

    const rows = await prisma.therapistAvailability.findMany({
      where: { therapistId: therapist.id },
      orderBy: { dayOfWeek: "asc" },
    });

    // Always return all 7 days — missing days default to closed
    const rowMap = new Map(rows.map(r => [r.dayOfWeek, r]));
    const schedule = DAY_NAMES.map((name, i) => {
      const r = rowMap.get(i);
      return r
        ? { day: name, dayOfWeek: i, open: r.startTime, close: r.endTime, closed: !r.isAvailable }
        : { day: name, dayOfWeek: i, open: "09:00", close: "17:00", closed: true };
    });

    return NextResponse.json({ schedule }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Public schedule fetch error:", error);
    return NextResponse.json({ schedule: [] }, { status: 500 });
  }
}
