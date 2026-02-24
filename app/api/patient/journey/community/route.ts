import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/journey/community — Get community feed, challenges, ranking
 */
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 20;

    // Community feed (anonymous)
    const posts = await (prisma as any).communityPost.findMany({
      where: { isVisible: true, ...(clinicId ? { clinicId } : {}) },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        content: true,
        highFives: true,
        isAnon: true,
        anonName: true,
        createdAt: true,
      },
    });

    // Active weekly challenge
    const now = new Date();
    const challenge = await (prisma as any).weeklyChallenge.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
        ...(clinicId ? { clinicId } : {}),
      },
      orderBy: { startsAt: "desc" },
    });

    // Ranking — patient's consistency position (anonymous)
    let rank = 0;
    let totalParticipants = 0;
    try {
      const allProgress = await (prisma as any).patientProgress.findMany({
        where: clinicId ? { clinicId } : {},
        select: { patientId: true, streakDays: true },
        orderBy: { streakDays: "desc" },
      });
      totalParticipants = allProgress.length;
      const idx = allProgress.findIndex((p: any) => p.patientId === userId);
      rank = idx >= 0 ? idx + 1 : totalParticipants;
    } catch {}

    return NextResponse.json({ posts, challenge, rank, totalParticipants });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/patient/journey/community — High-five a post or contribute to challenge
 * body: { action: "high_five" | "contribute", postId?, challengeId?, amount? }
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
    const { action, postId, challengeId, amount } = await req.json();

    if (action === "high_five" && postId) {
      await (prisma as any).communityPost.update({
        where: { id: postId },
        data: { highFives: { increment: 1 } },
      });

      // XP for giving high fives
      await (prisma as any).patientProgress.update({
        where: { patientId: userId },
        data: { totalXpEarned: { increment: 2 }, xp: { increment: 2 } },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "contribute" && challengeId) {
      const contribution = amount || 1;
      const challenge = await (prisma as any).weeklyChallenge.update({
        where: { id: challengeId },
        data: { current: { increment: contribution } },
      });

      // XP for contributing
      await (prisma as any).patientProgress.update({
        where: { patientId: userId },
        data: { totalXpEarned: { increment: 5 }, xp: { increment: 5 }, bprCredits: { increment: 1 } },
      });

      // Check if challenge completed
      if (challenge.current >= challenge.target && !challenge.completedAt) {
        await (prisma as any).weeklyChallenge.update({
          where: { id: challengeId },
          data: { completedAt: new Date() },
        });
      }

      return NextResponse.json({ success: true, newCurrent: challenge.current });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
