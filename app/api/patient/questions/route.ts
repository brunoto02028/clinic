import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";

export const dynamic = "force-dynamic";

// GET — patient fetches their pending questions
export async function GET() {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patientId = effectiveUser.userId;

  const questions = await (prisma as any).patientQuestion.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(questions);
}

// POST — patient submits answers
export async function POST(req: NextRequest) {
  const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patientId = effectiveUser.userId;

  const { questionSetId, answers } = await req.json();
  if (!questionSetId || !answers) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const qset = await (prisma as any).patientQuestion.findFirst({
    where: { id: questionSetId, patientId },
  });
  if (!qset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await (prisma as any).patientQuestion.update({
    where: { id: questionSetId },
    data: { answers, status: "answered", answeredAt: new Date() },
  });
  return NextResponse.json(updated);
}
