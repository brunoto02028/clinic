import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

/**
 * GET /api/biohacking/patients
 * Returns monitoring data for all patients in the clinic:
 * - Latest check-in
 * - 7-day trend for energy, pain, sleep, stress, HRV
 * - Active protocol
 * - Alert flags (declining trends)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { clinicId: true, role: true },
    });
    if (!user?.clinicId || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const patients = await prisma.user.findMany({
      where: { clinicId: user.clinicId, role: "PATIENT", isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profileImageUrl: true,
        dailyCheckIns: {
          where: { checkinDate: { gte: sevenDaysAgoStr } },
          orderBy: { checkinDate: "desc" },
          take: 7,
        },
        biohackingProtocols: {
          where: { isActive: true },
          include: { protocol: { select: { name: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        wearableConnections: {
          where: { status: "CONNECTED" },
          select: { provider: true, lastSyncedAt: true, terraUserId: true },
          take: 3,
        },
        wearableDataPoints: {
          orderBy: { dataDate: "desc" },
          take: 1,
          select: { dataDate: true, provider: true, hrv: true, restingHr: true, sleepScore: true, hrvScore: true, steps: true },
        },
      },
      orderBy: { firstName: "asc" },
    });

    const enriched = patients.map((p: any) => {
      const checks = p.dailyCheckIns || [];
      const latest = checks[0] || null;

      // Build 7-day trend arrays
      const trend = {
        energy:  checks.map((c: any) => ({ date: c.checkinDate, value: c.energyLevel })).reverse(),
        pain:    checks.map((c: any) => ({ date: c.checkinDate, value: c.painLevel })).reverse(),
        sleep:   checks.map((c: any) => ({ date: c.checkinDate, value: c.sleepQuality })).reverse(),
        stress:  checks.map((c: any) => ({ date: c.checkinDate, value: c.stressLevel })).reverse(),
        hrv:     checks.map((c: any) => ({ date: c.checkinDate, value: c.hrv })).filter((x: any) => x.value != null).reverse(),
      };

      // Alert: pain increasing or energy/sleep declining over last 3 days
      const alerts: string[] = [];
      const last3 = checks.slice(0, 3);
      if (last3.length >= 2) {
        const painTrend = last3[0]?.painLevel - last3[last3.length - 1]?.painLevel;
        if (painTrend > 2) alerts.push("Pain increasing");
        const energyTrend = last3[0]?.energyLevel - last3[last3.length - 1]?.energyLevel;
        if (energyTrend != null && energyTrend < -2) alerts.push("Energy declining");
        const sleepTrend = last3[0]?.sleepQuality - last3[last3.length - 1]?.sleepQuality;
        if (sleepTrend != null && sleepTrend < -2) alerts.push("Sleep deteriorating");
      }
      if (checks.length === 0) alerts.push("No check-ins in 7 days");
      else if (latest?.checkinDate < sevenDaysAgoStr) alerts.push("No recent check-in");

      const activeProtocol = p.biohackingProtocols?.[0]?.protocol?.name || null;

      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        profileImageUrl: p.profileImageUrl,
        latest,
        trend,
        alerts,
        activeProtocol,
        checkInCount: checks.length,
        wearableConnections: p.wearableConnections || [],
        latestWearable: p.wearableDataPoints?.[0] || null,
      };
    });

    return NextResponse.json({ patients: enriched });
  } catch (err: any) {
    console.error("[biohacking/patients GET]", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
