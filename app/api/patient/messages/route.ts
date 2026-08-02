import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { saveChatAttachment } from "@/lib/chat-attachment";

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
