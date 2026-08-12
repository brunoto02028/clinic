import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { saveChatAttachment } from "@/lib/chat-attachment";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET — patient's own message thread
export async function GET() {
  const effective = await getEffectiveUser();
  if (!effective) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = effective.userId;

  // Lazy-dispatch due scheduled broadcasts so patients see them on time
  await dispatchDueBroadcasts().catch(() => {});

  const messages = await (prisma as any).clinicMessage.findMany({
    where: { patientId: userId },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

// POST — patient sends a reply to the clinic
export async function POST(req: NextRequest) {
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
      select: { firstName: true, lastName: true },
    });
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
    const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
    const preview = content ? content.slice(0, 300) : (attachment ? `📎 ${attachment.fileName}` : "");

    await sendEmail({
      to: process.env.ADMIN_EMAIL || "brunotoaz@gmail.com",
      subject: `💬 Nova mensagem de ${patientName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1a6b6b;">Nova mensagem no chat</h2>
        <p style="color:#374151;"><strong>${patientName}</strong> enviou uma mensagem:</p>
        <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;color:#374151;font-size:14px;">${preview}</div>
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
