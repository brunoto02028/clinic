import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

// GET — list all published achievements + patient's unlocked ones
export async function GET() {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
  const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

  const [achievements, unlocked] = await Promise.all([
    (prisma as any).achievement.findMany({
      where: { clinicId, isActive: true, isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        condition: { select: { id: true, nameEn: true, namePt: true, iconEmoji: true } },
      },
    }),
    (prisma as any).patientAchievement.findMany({
      where: { patientId: userId },
      select: { achievementId: true, unlockedAt: true, xpEarned: true },
    }),
  ]);

  const unlockedMap: Record<string, any> = {};
  for (const u of unlocked) {
    unlockedMap[u.achievementId] = u;
  }

  const result = achievements.map((a: any) => ({
    ...a,
    isUnlocked: !!unlockedMap[a.id],
    unlockedAt: unlockedMap[a.id]?.unlockedAt || null,
  }));

  const totalUnlocked = unlocked.length;
  const totalXp = unlocked.reduce((sum: number, u: any) => sum + (u.xpEarned || 0), 0);

  return NextResponse.json({ achievements: result, totalUnlocked, totalXp, totalAchievements: achievements.length });
}
