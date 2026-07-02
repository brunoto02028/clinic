import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF"];

// GET — list all question sets for patient
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const questions = await (prisma as any).patientQuestion.findMany({
    where: { patientId: params.id },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(questions);
}

// POST — send new set of questions to patient
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questions, context, language = "en" } = await req.json();
  if (!questions?.length) return NextResponse.json({ error: "No questions" }, { status: 400 });

  const qset = await (prisma as any).patientQuestion.create({
    data: {
      patientId: params.id,
      createdById: (session.user as any).id,
      questions,
      context,
      language,
      status: "pending",
    },
  });
  return NextResponse.json(qset, { status: 201 });
}
