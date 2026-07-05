import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — patient's own message thread
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const messages = await (prisma as any).clinicMessage.findMany({
    where: { patientId: userId },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

// POST — patient sends a reply to the clinic
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const message = await (prisma as any).clinicMessage.create({
    data: {
      patientId: userId,
      senderId: userId,
      senderRole: "patient",
      kind: "message",
      content: content.trim(),
    },
    include: { sender: { select: { firstName: true, lastName: true, role: true } } },
  });

  return NextResponse.json(message, { status: 201 });
}

// PATCH — mark staff messages as read
export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const updated = await (prisma as any).clinicMessage.updateMany({
    where: { patientId: userId, senderRole: "staff", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ updated: updated.count });
}
