import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

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
  const { questions, context, language = "en", type = "questions" } = await req.json();
  if (!questions?.length) return NextResponse.json({ error: "No questions" }, { status: 400 });

  const [qset, patient] = await Promise.all([
    (prisma as any).patientQuestion.create({
      data: {
        patientId: params.id,
        createdById: (session.user as any).id,
        questions,
        context,
        language,
        type,
        status: type === "report" ? "answered" : "pending",
      },
    }),
    prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  if (patient) {
    const appUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
    const isPt = language === "pt";
    try {
      await notifyPatient({
        patientId: patient.id,
        emailTemplateSlug: "PATIENT_QUESTIONS",
        emailVars: {
          patientName: `${patient.firstName} ${patient.lastName}`,
          questionCount: String(questions.length),
          context: context || (isPt ? "Pré-consulta" : "Pre-consultation"),
          portalUrl: `${appUrl}/dashboard/questions`,
        },
        plainMessage: `Your therapist sent you ${questions.length} question${questions.length > 1 ? "s" : ""} to answer before your appointment. Visit your portal: ${appUrl}/dashboard/questions`,
        plainMessagePt: `O seu terapeuta enviou ${questions.length} pergunta${questions.length > 1 ? "s" : ""} para responder antes da consulta. Aceda ao portal: ${appUrl}/dashboard/questions`,
      });
    } catch (e) {
      console.error("[questions] Failed to notify patient:", e);
    }
  }

  return NextResponse.json(qset, { status: 201 });
}

// PATCH — mark a question set as reviewed (admin read the answers)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questionSetId } = await req.json();
  if (!questionSetId) return NextResponse.json({ error: "questionSetId required" }, { status: 400 });

  const updated = await (prisma as any).patientQuestion.updateMany({
    where: { id: questionSetId, patientId: params.id, status: "answered" },
    data: { status: "reviewed" },
  });
  return NextResponse.json({ updated: updated.count });
}
