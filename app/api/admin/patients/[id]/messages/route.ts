import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { saveChatAttachment } from "@/lib/chat-attachment";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

// GET — full message thread for a patient
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await (prisma as any).clinicMessage.findMany({
    where: { patientId: params.id },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Mark patient-sent messages as read by staff
  await (prisma as any).clinicMessage.updateMany({
    where: { patientId: params.id, senderRole: "patient", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json(messages);
}

// POST — staff sends a message/notice to the patient
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let content = "";
  let title: string | null = null;
  let kind = "message";
  let attachment: { fileUrl: string; fileName: string; fileType: string } | null = null;

  const reqContentType = req.headers.get("content-type") || "";
  if (reqContentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    content = ((formData.get("content") as string) || "").trim();
    title = (formData.get("title") as string) || null;
    kind = (formData.get("kind") as string) || "message";
    const file = formData.get("file") as File | null;
    if (file && file.size > 0) {
      try {
        attachment = await saveChatAttachment({ file, patientId: params.id, uploaderId: (session.user as any).id });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }
  } else {
    const body = await req.json();
    content = (body.content || "").trim();
    title = body.title || null;
    kind = body.kind || "message";
  }

  if (!content && !attachment) {
    return NextResponse.json({ error: "content or file required" }, { status: 400 });
  }

  const [message, patient] = await Promise.all([
    (prisma as any).clinicMessage.create({
      data: {
        patientId: params.id,
        senderId: (session.user as any).id,
        senderRole: "staff",
        kind,
        title: title || null,
        content: content || (attachment ? `📎 ${attachment.fileName}` : ""),
        attachmentUrl: attachment?.fileUrl || null,
        attachmentName: attachment?.fileName || null,
        attachmentType: attachment?.fileType || null,
      },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  if (patient) {
    const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
    const preview = (content || attachment?.fileName || "").slice(0, 120);
    try {
      await notifyPatient({
        patientId: patient.id,
        plainMessage: `New message from your clinic: "${preview}" — read and reply in your portal: ${appUrl}/dashboard/questions`,
        plainMessagePt: `Nova mensagem da sua clínica: "${preview}" — leia e responda no portal: ${appUrl}/dashboard/questions`,
      });
    } catch (e) {
      console.error("[messages] Failed to notify patient:", e);
    }
  }

  return NextResponse.json(message, { status: 201 });
}

// DELETE — staff removes a message
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { messageId } = await req.json();
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });

  await (prisma as any).clinicMessage.deleteMany({
    where: { id: messageId, patientId: params.id },
  });
  return NextResponse.json({ deleted: true });
}
