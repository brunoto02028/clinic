import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

/**
 * GET /api/patient/daily-checkin
 * Returns today's check-in (if done) + last 7 days history
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = effectiveUser.userId;
    const today = todayStr();

    const [todayCheckIn, history] = await Promise.all([
      (prisma as any).dailyCheckIn.findUnique({
        where: { patientId_checkinDate: { patientId: userId, checkinDate: today } },
      }),
      (prisma as any).dailyCheckIn.findMany({
        where: { patientId: userId },
        orderBy: { checkinDate: "desc" },
        take: 7,
      }),
    ]);

    return NextResponse.json({ today: todayCheckIn, history, todayDate: today });
  } catch (err: any) {
    console.error("[daily-checkin GET]", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

/**
 * POST /api/patient/daily-checkin
 * Save or update today's check-in
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    const clinicId = _u?.clinicId || null;

    const body = await req.json();
    const { painLevel, moodLevel, exercisesDone, notes, energyLevel, sleepQuality, stressLevel, hrv } = body;

    if (painLevel === undefined || moodLevel === undefined) {
      return NextResponse.json({ error: "painLevel and moodLevel are required" }, { status: 400 });
    }

    const today = todayStr();

    const bioFields = {
      energyLevel:  energyLevel  != null ? Math.min(10, Math.max(1, energyLevel))  : null,
      sleepQuality: sleepQuality != null ? Math.min(10, Math.max(1, sleepQuality)) : null,
      stressLevel:  stressLevel  != null ? Math.min(10, Math.max(1, stressLevel))  : null,
      hrv:          hrv          != null ? Number(hrv)                              : null,
    };

    const checkIn = await (prisma as any).dailyCheckIn.upsert({
      where: { patientId_checkinDate: { patientId: userId, checkinDate: today } },
      create: {
        patientId: userId,
        clinicId,
        checkinDate: today,
        painLevel: Math.min(10, Math.max(0, painLevel)),
        moodLevel: Math.min(5, Math.max(1, moodLevel)),
        exercisesDone: exercisesDone ?? false,
        notes: notes || null,
        ...bioFields,
      },
      update: {
        painLevel: Math.min(10, Math.max(0, painLevel)),
        moodLevel: Math.min(5, Math.max(1, moodLevel)),
        exercisesDone: exercisesDone ?? false,
        notes: notes || null,
        ...bioFields,
      },
    });

    // Award XP for daily check-in (15 XP, once per day)
    try {
      const progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: userId } });
      if (progress) {
        const lastActiveDate = progress.lastActiveDate ? new Date(progress.lastActiveDate).toISOString().split("T")[0] : null;
        const alreadyActive = lastActiveDate === today;
        if (!alreadyActive) {
          await (prisma as any).patientProgress.update({
            where: { patientId: userId },
            data: {
              xp: { increment: 15 },
              totalXpEarned: { increment: 15 },
              bprCredits: { increment: 1 },
              lastActiveDate: new Date(),
            },
          });
        }
      }
    } catch {}

    return NextResponse.json({ checkIn, xpAwarded: 15 });
  } catch (err: any) {
    console.error("[daily-checkin POST]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
