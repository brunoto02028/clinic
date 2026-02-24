import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import { calculateArchetype, getArchetype, XP_REWARDS } from "@/lib/journey";

export const dynamic = "force-dynamic";

/**
 * GET /api/patient/journey/quiz — Get latest quiz result
 */
export async function GET() {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;

    const result = await (prisma as any).patientQuizResult.findFirst({
      where: { patientId: userId },
      orderBy: { completedAt: "desc" },
    });

    if (!result) return NextResponse.json({ completed: false });

    const archetype = getArchetype(result.archetypeKey);
    return NextResponse.json({ completed: true, result, archetype });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/patient/journey/quiz — Submit quiz answers
 * body: { answers: [{ questionId, answer }] }
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;
    const { answers } = await req.json();

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 });
    }

    const archetypeKey = calculateArchetype(answers);
    const archetype = getArchetype(archetypeKey);

    const result = await (prisma as any).patientQuizResult.create({
      data: { patientId: userId, clinicId, archetypeKey, answers },
    });

    // Update progress with archetype
    await (prisma as any).patientProgress.upsert({
      where: { patientId: userId },
      update: { archetypeKey },
      create: { patientId: userId, clinicId, archetypeKey },
    });

    // Add XP for quiz completion
    const xp = XP_REWARDS.quiz_completed;
    await (prisma as any).patientProgress.update({
      where: { patientId: userId },
      data: { totalXpEarned: { increment: xp }, xp: { increment: xp }, bprCredits: { increment: Math.floor(xp / 10) } },
    });

    // Unlock quiz badge
    try {
      await (prisma as any).patientBadge.create({
        data: { patientId: userId, clinicId, badgeKey: "quiz_master" },
      });
    } catch {} // Already unlocked

    return NextResponse.json({ success: true, archetypeKey, archetype, xpEarned: xp, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
