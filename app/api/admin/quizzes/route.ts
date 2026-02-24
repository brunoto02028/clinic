import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

// GET — list all quizzes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  const { searchParams } = new URL(req.url);
  const conditionId = searchParams.get("conditionId");

  const where: any = { clinicId };
  if (conditionId) where.conditionId = conditionId;

  const quizzes = await (prisma as any).quiz.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      condition: { select: { id: true, nameEn: true, namePt: true, iconEmoji: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });
  return NextResponse.json({ quizzes });
}

// POST — create quiz (manual or AI-generated)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const clinicId = (session.user as any).clinicId;
  const userId = (session.user as any).id;
  const body = await req.json();

  const { titleEn, titlePt, descriptionEn, descriptionPt, conditionId, category, difficulty, xpReward, iconEmoji, questions, isPublished } = body;
  if (!titleEn || !titlePt) {
    return NextResponse.json({ error: "titleEn and titlePt are required" }, { status: 400 });
  }

  const quiz = await (prisma as any).quiz.create({
    data: {
      clinicId,
      createdById: userId,
      titleEn,
      titlePt,
      descriptionEn: descriptionEn || null,
      descriptionPt: descriptionPt || null,
      conditionId: conditionId || null,
      category: category || "general",
      difficulty: difficulty || "beginner",
      xpReward: xpReward || 25,
      iconEmoji: iconEmoji || null,
      isPublished: isPublished ?? false,
      questions: questions?.length
        ? {
            create: questions.map((q: any, i: number) => ({
              questionEn: q.questionEn,
              questionPt: q.questionPt,
              options: q.options, // JSON array
              explanationEn: q.explanationEn || null,
              explanationPt: q.explanationPt || null,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { questions: true, condition: true },
  });

  return NextResponse.json({ quiz });
}

// PATCH — update quiz
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json();
  const { id, questions, ...data } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Update quiz fields
  const quiz = await (prisma as any).quiz.update({
    where: { id },
    data,
  });

  // If questions are provided, replace all
  if (questions && Array.isArray(questions)) {
    await (prisma as any).quizQuestion.deleteMany({ where: { quizId: id } });
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await (prisma as any).quizQuestion.create({
        data: {
          quizId: id,
          questionEn: q.questionEn,
          questionPt: q.questionPt,
          options: q.options,
          explanationEn: q.explanationEn || null,
          explanationPt: q.explanationPt || null,
          sortOrder: i,
        },
      });
    }
  }

  const updated = await (prisma as any).quiz.findUnique({
    where: { id },
    include: { questions: { orderBy: { sortOrder: "asc" } }, condition: true },
  });

  return NextResponse.json({ quiz: updated });
}

// DELETE — delete quiz
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await (prisma as any).quiz.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
