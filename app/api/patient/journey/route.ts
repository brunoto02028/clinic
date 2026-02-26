import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import { getLevelForXP, getXPToNextLevel, XP_REWARDS } from "@/lib/journey";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/journey — Get full journey state (progress, missions, badges, recovery ring)
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;

    // Resolve clinicId
    const _usr = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    const clinicIdForProgress = _usr?.clinicId || null;

    // Ensure PatientProgress exists
    let progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: userId } });
    if (!progress) {
      progress = await (prisma as any).patientProgress.create({
        data: { patientId: userId, clinicId: clinicIdForProgress },
      });
    }

    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (progress.lastActiveDate) {
      const lastActive = new Date(progress.lastActiveDate);
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        // Streak broken
        await (prisma as any).patientProgress.update({
          where: { patientId: userId },
          data: { streakDays: 0 },
        });
        progress.streakDays = 0;
      }
    }

    // Level info
    const levelDef = getLevelForXP(progress.totalXpEarned);
    const xpInfo = getXPToNextLevel(progress.totalXpEarned);

    // Current week missions — auto-generate if none exist
    const weekStart = getWeekStart();
    let missions = await (prisma as any).dailyMission.findMany({
      where: { patientId: userId, weekStart },
      orderBy: { createdAt: "asc" },
    });

    if (missions.length === 0) {
      // Auto-generate standard weekly mission
      try {
        const stdMission = await (prisma as any).dailyMission.create({
          data: {
            patientId: userId,
            clinicId: clinicIdForProgress,
            weekStart,
            xpReward: 50,
            tasks: [
              { key: "complete_exercises", label: "Complete 2 exercises from Treatment Plan", labelPt: "Complete 2 exercícios do Plano de Tratamento", completed: false, xp: 20 },
              { key: "pain_checkin", label: "Do a pain check-in", labelPt: "Faça um check-in de dor", completed: false, xp: 15 },
              { key: "read_article", label: "Read 1 educational article", labelPt: "Leia 1 artigo educativo", completed: false, xp: 10 },
            ],
          },
        });
        missions = [stdMission];

        // Bonus mission for level 5+
        if (progress.level >= 5) {
          const bonusMission = await (prisma as any).dailyMission.create({
            data: {
              patientId: userId,
              clinicId: clinicIdForProgress,
              weekStart,
              xpReward: 100,
              isBonusMission: true,
              tasks: [
                { key: "body_assessment", label: "Complete a body assessment", labelPt: "Complete uma avaliação corporal", completed: false, xp: 25 },
                { key: "community_high_five", label: "Give 3 high fives in the community", labelPt: "Dê 3 high fives na comunidade", completed: false, xp: 10 },
                { key: "share_victory", label: "Share a victory in the community", labelPt: "Compartilhe uma vitória na comunidade", completed: false, xp: 15 },
              ],
            },
          });
          missions.push(bonusMission);
        }
      } catch (missionErr) {
        console.error("[journey] Auto-generate missions error:", missionErr);
      }
    }

    // Badges
    const badges = await (prisma as any).patientBadge.findMany({
      where: { patientId: userId },
      orderBy: { unlockedAt: "desc" },
    });

    // Recovery Ring data
    const ring = await computeRecoveryRing(userId);

    // Notifications (unread)
    const unreadNotifications = await (prisma as any).journeyNotification.count({
      where: { patientId: userId, isRead: false },
    });

    // Quiz result
    const quizResult = await (prisma as any).patientQuizResult.findFirst({
      where: { patientId: userId },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({
      progress: {
        ...progress,
        level: levelDef.level,
        levelTitle: levelDef.title,
        avatarStage: levelDef.avatarStage,
        xpInLevel: xpInfo.current,
        xpToNextLevel: xpInfo.needed,
        nextLevel: xpInfo.next,
      },
      missions,
      badges: badges.map((b: any) => b.badgeKey),
      badgeDetails: badges,
      ring,
      unreadNotifications,
      quizResult,
    });
  } catch (err: any) {
    console.error("[patient/journey] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/patient/journey — Add XP, complete task, mark activity
 * body: { action: "add_xp" | "complete_mission_task" | "mark_active", ... }
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;
    const body = await req.json();

    // Ensure progress exists
    let progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: userId } });
    if (!progress) {
      progress = await (prisma as any).patientProgress.create({
        data: { patientId: userId, clinicId },
      });
    }

    switch (body.action) {
      case "add_xp": {
        const xpType = body.xpType as keyof typeof XP_REWARDS;
        const xpAmount = XP_REWARDS[xpType] || body.amount || 0;
        if (xpAmount <= 0) return NextResponse.json({ error: "Invalid XP type" }, { status: 400 });

        const newTotalXp = progress.totalXpEarned + xpAmount;
        const newLevel = getLevelForXP(newTotalXp);
        const leveledUp = newLevel.level > getLevelForXP(progress.totalXpEarned).level;

        await (prisma as any).patientProgress.update({
          where: { patientId: userId },
          data: {
            totalXpEarned: newTotalXp,
            xp: { increment: xpAmount },
            level: newLevel.level,
            levelTitle: newLevel.title,
            bprCredits: { increment: Math.floor(xpAmount / 10) },
          },
        });

        // Check if leveled up
        if (leveledUp) {
          // Resolve patient locale for bilingual notification
          let isPtUser = false;
          try {
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { preferredLocale: true } as any });
            isPtUser = ((u as any)?.preferredLocale || 'en-GB').startsWith('pt');
          } catch {}
          await (prisma as any).journeyNotification.create({
            data: {
              patientId: userId,
              clinicId,
              type: "level_up",
              title: isPtUser ? `🎉 Subiu de Nível! Nível ${newLevel.level}` : `🎉 Level Up! Level ${newLevel.level}`,
              message: isPtUser ? `Parabéns! Agora você é ${newLevel.title}!` : `Congratulations! You are now a ${newLevel.title}!`,
              actionUrl: "/dashboard/journey",
            },
          });
          // Auto-post to community
          await (prisma as any).communityPost.create({
            data: {
              patientId: userId,
              clinicId,
              type: "level_up",
              content: isPtUser ? `alcançou o Nível ${newLevel.level} — ${newLevel.title}! 🎉` : `reached Level ${newLevel.level} — ${newLevel.title}! 🎉`,
              isAnon: true,
              anonName: `RecoveryHero_${userId.slice(-4)}`,
            },
          });
        }

        return NextResponse.json({ success: true, xpAdded: xpAmount, newTotalXp, leveledUp, newLevel: newLevel.level });
      }

      case "complete_mission_task": {
        const { missionId, taskKey } = body;
        const mission = await (prisma as any).dailyMission.findUnique({ where: { id: missionId } });
        if (!mission || mission.patientId !== userId) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

        const tasks = mission.tasks as any[];
        const task = tasks.find((t: any) => t.key === taskKey);
        if (!task || task.completed) return NextResponse.json({ error: "Task not found or already completed" }, { status: 400 });

        task.completed = true;
        const allCompleted = tasks.every((t: any) => t.completed);

        await (prisma as any).dailyMission.update({
          where: { id: missionId },
          data: {
            tasks,
            ...(allCompleted ? { completedAt: new Date() } : {}),
          },
        });

        // Add task XP
        const taskXp = task.xp || 10;
        const bonusXp = allCompleted ? (mission.xpReward || 50) : 0;
        const totalXpGain = taskXp + bonusXp;

        const newTotalXp = progress.totalXpEarned + totalXpGain;
        const newLevel = getLevelForXP(newTotalXp);

        await (prisma as any).patientProgress.update({
          where: { patientId: userId },
          data: {
            totalXpEarned: newTotalXp,
            xp: { increment: totalXpGain },
            level: newLevel.level,
            levelTitle: newLevel.title,
            bprCredits: { increment: Math.floor(totalXpGain / 10) },
          },
        });

        return NextResponse.json({ success: true, taskCompleted: true, allCompleted, xpGained: totalXpGain });
      }

      case "mark_active": {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let newStreak = progress.streakDays;

        if (progress.lastActiveDate) {
          const lastActive = new Date(progress.lastActiveDate);
          lastActive.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) newStreak += 1;
          else if (diffDays > 1) newStreak = 1;
          // same day = no change
        } else {
          newStreak = 1;
        }

        const longestStreak = Math.max(progress.longestStreak, newStreak);

        await (prisma as any).patientProgress.update({
          where: { patientId: userId },
          data: { streakDays: newStreak, longestStreak, lastActiveDate: new Date() },
        });

        // Check streak badges
        const streakBadges = [
          { streak: 3, key: "streak_3" },
          { streak: 7, key: "streak_7" },
          { streak: 14, key: "streak_14" },
          { streak: 30, key: "streak_30" },
        ];
        for (const sb of streakBadges) {
          if (newStreak >= sb.streak) {
            await unlockBadge(userId, clinicId, sb.key);
          }
        }

        return NextResponse.json({ success: true, streakDays: newStreak, longestStreak });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[patient/journey] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Helpers ───

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

async function unlockBadge(patientId: string, clinicId: string | null, badgeKey: string): Promise<boolean> {
  try {
    const existing = await (prisma as any).patientBadge.findUnique({
      where: { patientId_badgeKey: { patientId, badgeKey } },
    });
    if (existing) return false;

    await (prisma as any).patientBadge.create({
      data: { patientId, clinicId, badgeKey },
    });

    // Resolve patient locale for bilingual notification
    let isPtBadge = false;
    try {
      const u = await prisma.user.findUnique({ where: { id: patientId }, select: { preferredLocale: true } as any });
      isPtBadge = ((u as any)?.preferredLocale || 'en-GB').startsWith('pt');
    } catch {}

    await (prisma as any).journeyNotification.create({
      data: {
        patientId,
        clinicId,
        type: "badge",
        title: isPtBadge ? `🏅 Nova Conquista Desbloqueada!` : `🏅 New Badge Unlocked!`,
        message: isPtBadge ? `Você desbloqueou a conquista "${badgeKey}"!` : `You unlocked the "${badgeKey}" badge!`,
        actionUrl: "/dashboard/journey",
      },
    });

    // Community post
    await (prisma as any).communityPost.create({
      data: {
        patientId,
        clinicId,
        type: "badge_unlock",
        content: isPtBadge ? `desbloqueou a conquista "${badgeKey}"! 🏅` : `unlocked the "${badgeKey}" badge! 🏅`,
        isAnon: true,
        anonName: `RecoveryHero_${patientId.slice(-4)}`,
      },
    });

    return true;
  } catch {
    return false;
  }
}

async function computeRecoveryRing(patientId: string) {
  try {
    // Exercise ring: protocol items completed this week / total assigned
    const weekStart = getWeekStart();
    const protocol = await (prisma as any).treatmentProtocol.findFirst({
      where: { patientId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    let exercisePercent = 0;
    if (protocol?.items?.length > 0) {
      const homeExercises = protocol.items.filter((i: any) => i.type === "HOME_EXERCISE");
      const completed = homeExercises.filter((i: any) => i.isCompleted);
      exercisePercent = homeExercises.length > 0 ? Math.round((completed.length / homeExercises.length) * 100) : 0;
    }

    // Consistency ring: days active this week / 7
    const progress = await (prisma as any).patientProgress.findUnique({ where: { patientId } });
    const consistencyPercent = progress ? Math.min(100, Math.round((progress.streakDays / 7) * 100)) : 0;

    // Wellbeing ring: average inverse pain (10 - pain) / 10 * 100
    // For now use a simple calculation based on last body assessment score
    let wellbeingPercent = 50; // default
    const lastAssessment = await (prisma as any).bodyAssessment.findFirst({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      select: { overallScore: true },
    });
    if (lastAssessment?.overallScore) {
      wellbeingPercent = Math.round(lastAssessment.overallScore);
    }

    return {
      exercise: Math.min(100, exercisePercent),
      consistency: Math.min(100, consistencyPercent),
      wellbeing: Math.min(100, wellbeingPercent),
    };
  } catch {
    return { exercise: 0, consistency: 0, wellbeing: 0 };
  }
}
