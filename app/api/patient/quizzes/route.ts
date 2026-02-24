import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

// GET — list published quizzes available to patient + their attempts
export async function GET() {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
  const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

  const quizzes = await (prisma as any).quiz.findMany({
    where: { clinicId, isActive: true, isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      condition: { select: { id: true, nameEn: true, namePt: true, iconEmoji: true } },
      questions: { orderBy: { sortOrder: "asc" } },
      attempts: { where: { patientId: userId }, orderBy: { completedAt: "desc" } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ quizzes });
}

// POST — submit quiz attempt
export async function POST(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
  const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;
  const body = await req.json();

  const { quizId, answers } = body;
  if (!quizId || !answers) {
    return NextResponse.json({ error: "quizId and answers required" }, { status: 400 });
  }

  // Fetch quiz with questions to validate
  const quiz = await (prisma as any).quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Calculate score
  let score = 0;
  const processedAnswers = quiz.questions.map((q: any, i: number) => {
    const answer = answers[i];
    const selectedIndex = answer?.selectedIndex ?? -1;
    const options = q.options as any[];
    const isCorrect = selectedIndex >= 0 && selectedIndex < options.length && options[selectedIndex]?.isCorrect === true;
    if (isCorrect) score++;
    return { questionId: q.id, selectedIndex, isCorrect };
  });

  const totalQuestions = quiz.questions.length;
  const xpEarned = score === totalQuestions ? quiz.xpReward : Math.round(quiz.xpReward * (score / totalQuestions) * 0.5);

  const attempt = await (prisma as any).patientQuizAttempt.create({
    data: {
      clinicId,
      patientId: userId,
      quizId,
      answers: processedAnswers,
      score,
      totalQuestions,
      xpEarned,
    },
  });

  // Award XP to patient progress if exists
  try {
    await (prisma as any).patientProgress.updateMany({
      where: { patientId: userId },
      data: { totalXpEarned: { increment: xpEarned } },
    });
  } catch {}

  return NextResponse.json({ attempt, score, totalQuestions, xpEarned });
}
