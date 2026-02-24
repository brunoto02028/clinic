import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/journey — Dashboard stats for BPR Journey admin
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clinicId = (session.user as any).clinicId;
    const clinicFilter = clinicId ? { clinicId } : {};

    const [
      totalProgress,
      avgLevel,
      avgStreak,
      totalBadges,
      totalMissions,
      completedMissions,
      totalCommunityPosts,
      totalHighFives,
      activeChallenge,
      totalProducts,
      totalQuizzes,
      totalNotifications,
      topPlayers,
      recentBadges,
      recentPosts,
    ] = await Promise.all([
      (prisma as any).patientProgress.count({ where: clinicFilter }),
      (prisma as any).patientProgress.aggregate({ where: clinicFilter, _avg: { level: true, streakDays: true, totalXpEarned: true, bprCredits: true } }),
      (prisma as any).patientProgress.aggregate({ where: clinicFilter, _max: { streakDays: true, level: true } }),
      (prisma as any).patientBadge.count({ where: clinicFilter }),
      (prisma as any).dailyMission.count({ where: clinicFilter }),
      (prisma as any).dailyMission.count({ where: { ...clinicFilter, completedAt: { not: null } } }),
      (prisma as any).communityPost.count({ where: clinicFilter }),
      (prisma as any).communityPost.aggregate({ where: clinicFilter, _sum: { highFives: true } }),
      (prisma as any).weeklyChallenge.findFirst({ where: { ...clinicFilter, isActive: true }, orderBy: { startsAt: "desc" } }),
      (prisma as any).marketplaceProduct.count({ where: { ...clinicFilter, isActive: true } }),
      (prisma as any).patientQuizResult.count({ where: clinicFilter }),
      (prisma as any).journeyNotification.count({ where: clinicFilter }),
      (prisma as any).patientProgress.findMany({
        where: clinicFilter,
        orderBy: { totalXpEarned: "desc" },
        take: 10,
        include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      (prisma as any).patientBadge.findMany({
        where: clinicFilter,
        orderBy: { unlockedAt: "desc" },
        take: 10,
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      }),
      (prisma as any).communityPost.findMany({
        where: clinicFilter,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalPlayers: totalProgress,
        avgLevel: Math.round((avgLevel._avg?.level || 0) * 10) / 10,
        avgStreak: Math.round((avgLevel._avg?.streakDays || 0) * 10) / 10,
        avgXp: Math.round(avgLevel._avg?.totalXpEarned || 0),
        avgCredits: Math.round(avgLevel._avg?.bprCredits || 0),
        maxStreak: avgStreak._max?.streakDays || 0,
        maxLevel: avgStreak._max?.level || 0,
        totalBadges,
        totalMissions,
        completedMissions,
        missionCompletionRate: totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0,
        totalCommunityPosts,
        totalHighFives: totalHighFives._sum?.highFives || 0,
        totalProducts,
        totalQuizzes,
        totalNotifications,
      },
      activeChallenge,
      topPlayers,
      recentBadges,
      recentPosts,
    });
  } catch (err: any) {
    console.error("[admin/journey] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
