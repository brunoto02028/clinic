import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — patient fetches their pending questions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patientId = (session.user as any).id;

  const questions = await (prisma as any).patientQuestion.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(questions);
}

// POST — patient submits answers
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patientId = (session.user as any).id;

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
