import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { saveChatAttachment } from "@/lib/chat-attachment";
import { signFileToken } from "@/lib/file-access-token";
import { sendEmail } from "@/lib/email";
import { patientGate } from "@/lib/patient-gate";

export const dynamic = "force-dynamic";

console.log("[QA-T4-MARKER] worktree=app_clinic port=4031");

// GET — patient's own message thread
export async function GET(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_messages" });
  if (__gate.response) return __gate.response;

  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = effective.userId;

  // Lazy-dispatch due scheduled broadcasts so patients see them on time.
  // Skipped while polling: the thread now refetches every few seconds, and a
  // scheduled broadcast that waits one page load to appear is fine — one that
  // re-runs this sweep every five seconds per open tab is not.
  const isPoll = req.nextUrl.searchParams.get("poll") === "1";
  if (!isPoll) {
    await dispatchDueBroadcasts().catch(() => {});
  }

  const messages = await (prisma as any).clinicMessage.findMany({
    where: { patientId: userId },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  // O anexo é servido por `/api/files/[id]`, que aceita **cookie ou token
  // assinado** — nunca o bearer do app. A web já está autenticada por cookie e
  // abre direto; o app precisa do token na URL, exatamente como a tela de
  // documentos já faz (`openUrl`). Sem isto o anexo existe, aparece no
  // registro, e o paciente não consegue abrir no celular.
  const comLink = messages.map((m: any) => {
    const docId = typeof m.attachmentUrl === "string"
      ? m.attachmentUrl.match(/\/api\/files\/([^/?]+)/)?.[1] ?? null
      : null;
    return {
      ...m,
      attachmentOpenUrl: docId ? `/api/files/${docId}?t=${signFileToken(docId, userId)}` : null,
    };
  });

  return NextResponse.json(comLink);
}

// POST — patient sends a reply to the clinic
export async function POST(req: NextRequest) {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_messages" });
  if (__gate.response) return __gate.response;

  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = effective.userId;

  let content = "";
  let attachment: { fileUrl: string; fileName: string; fileType: string } | null = null;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    content = ((formData.get("content") as string) || "").trim();
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      try {
        attachment = await saveChatAttachment({ file, patientId: userId, uploaderId: userId });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }
  } else {
    const body = await req.json();
    content = (body.content || "").trim();
  }

  if (!content && !attachment) {
    return NextResponse.json({ error: "content or file required" }, { status: 400 });
  }

  const message = await (prisma as any).clinicMessage.create({
    data: {
      patientId: userId,
      // Nascia nula; ver o comentário na rota do staff. Os contadores de
      // triagem em lib/command-context.ts já contavam errado por causa disso.
      clinicId: (await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }))?.clinicId ?? null,
      senderId: userId,
      senderRole: "patient",
      kind: "message",
      content: content || (attachment ? `📎 ${attachment.fileName}` : ""),
      attachmentUrl: attachment?.fileUrl || null,
      attachmentName: attachment?.fileName || null,
      attachmentType: attachment?.fileType || null,
    },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
  });

  // Notify the clinic by email — previously this only surfaced via the admin
  // sidebar badge, which is easy to miss if nobody has the panel open.
  try {
    const patient = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, clinicId: true },
    });
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
    const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
    const preview = content ? content.slice(0, 300) : (attachment ? `📎 ${attachment.fileName}` : "");

    const { getAdminNotificationEmail, escapeHtml } = await import("@/lib/admin-notify-email");
    await sendEmail({
      to: await getAdminNotificationEmail(patient?.clinicId),
      subject: `💬 Nova mensagem de ${patientName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a6b6b;">Nova mensagem no chat</h2>
        <p style="color:#374151;"><strong>${escapeHtml(patientName)}</strong> enviou uma mensagem:</p>
        <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;color:#374151;font-size:14px;">${escapeHtml(preview)}</div>
        <div style="margin-top:20px;text-align:center;">
          <a href="${appUrl}/admin/patients/${userId}" style="background:#5dc9c0;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">Ver conversa →</a>
        </div>
      </div>`,
    });
  } catch (e) {
    console.error("[patient-messages] Failed to notify staff:", e);
  }

  return NextResponse.json(message, { status: 201 });
}

// PATCH — mark staff messages as read
export async function PATCH() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ module: "mod_messages" });
  if (__gate.response) return __gate.response;

  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = effective.userId;

  const updated = await (prisma as any).clinicMessage.updateMany({
    where: { patientId: userId, senderRole: "staff", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: updated.count });
}
