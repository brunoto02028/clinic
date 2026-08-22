// API: patient exercise-adherence series for the progress charts.
//
// Adherence is derived from DailyCheckIn.exercisesDone — the daily "did you do
// your exercises?" flag — aggregated by ISO week. `percent` is share of the
// week's check-ins where exercises were done, so a week the patient never
// checked in simply has no bar rather than a misleading 0%.

import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/dual-auth";
import { prisma } from "@/lib/db";

function rangeCutoffISO(range: string | null): string | null {
  const days = range === "30d" ? 30 : range === "90d" ? 90 : null;
  if (days === null) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Monday (UTC) of the week containing a "YYYY-MM-DD" date, as "YYYY-MM-DD".
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const session = await getRequestSession(request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const cutoff = rangeCutoffISO(searchParams.get("range"));

  const checkins = await prisma.dailyCheckIn.findMany({
    where: { patientId: user.id, ...(cutoff ? { checkinDate: { gte: cutoff } } : {}) },
    orderBy: { checkinDate: "asc" },
    select: { checkinDate: true, exercisesDone: true },
  });

  const weeks = new Map<string, { doneCount: number; totalDays: number }>();
  for (const c of checkins) {
    const key = weekStart(c.checkinDate);
    const w = weeks.get(key) ?? { doneCount: 0, totalDays: 0 };
    w.totalDays += 1;
    if (c.exercisesDone) w.doneCount += 1;
    weeks.set(key, w);
  }

  const series = Array.from(weeks.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodStart, w]) => ({
      periodStart,
      doneCount: w.doneCount,
      totalDays: w.totalDays,
      percent: w.totalDays > 0 ? Math.round((w.doneCount / w.totalDays) * 100) : 0,
    }));

  return NextResponse.json({ series });
}
