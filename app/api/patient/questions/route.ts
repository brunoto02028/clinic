import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { sendEmail } from "@/lib/email";

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

  // Fetch patient name for notifications
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { firstName: true, lastName: true, email: true },
  });

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
  const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";

  // 1. Notify admin by email
  try {
    const qaLines = (qset.questions as string[]).map((q: string, i: number) => {
      const a = (answers as any[]).find((x: any) => x.index === i);
      return `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#374151;"><strong>${i + 1}. ${q}</strong><br/><span style="color:#059669;">${a?.answer || "—"}</span></td></tr>`;
    }).join("");

    await sendEmail({
      to: process.env.ADMIN_EMAIL || "brunotoaz@gmail.com",
      subject: `✅ ${patientName} respondeu às perguntas`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a6b6b;">Respostas recebidas</h2>
        <p style="color:#374151;"><strong>${patientName}</strong> respondeu ${(qset.questions as string[]).length} pergunta${(qset.questions as string[]).length !== 1 ? "s" : ""}.</p>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">${qaLines}</table>
        <div style="margin-top:20px;text-align:center;">
          <a href="${appUrl}/admin/patients/${patientId}" style="background:#5dc9c0;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">Ver perfil da paciente →</a>
        </div>
      </div>`,
    });
  } catch (e) {
    console.error("[questions] Failed to notify admin:", e);
  }

  // 2. Inject answers as system context message into Atlas chat
  try {
    const answersText = (qset.questions as string[]).map((q: string, i: number) => {
      const a = (answers as any[]).find((x: any) => x.index === i);
      return `Q${i + 1}: ${q}\nA: ${a?.answer || "(no answer)"}`;
    }).join("\n\n");

    const atlasMessage = `[PATIENT ANSWERS — ${new Date().toLocaleDateString("en-GB")}]\n${patientName} responded to pre-consultation questions:\n\n${answersText}`;

    await (prisma as any).atlasChatMessage.create({
      data: {
        patientId,
        role: "user",
        content: atlasMessage,
      },
    });
  } catch (e) {
    console.error("[questions] Failed to update Atlas context:", e);
  }

  return NextResponse.json(updated);
}
