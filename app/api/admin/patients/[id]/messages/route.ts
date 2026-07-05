import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

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

  const { content, title, kind = "message", language = "en" } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const [message, patient] = await Promise.all([
    (prisma as any).clinicMessage.create({
      data: {
        patientId: params.id,
        senderId: (session.user as any).id,
        senderRole: "staff",
        kind,
        title: title || null,
        content: content.trim(),
      },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    }),
    prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
  ]);

  if (patient) {
    const appUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
    const preview = content.trim().slice(0, 120);
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
