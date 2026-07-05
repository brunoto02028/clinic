import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN", "STAFF", "THERAPIST"];

// GET — broadcast history with read stats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const broadcasts = await (prisma as any).clinicBroadcast.findMany({
    include: {
      sentBy: { select: { firstName: true, lastName: true } },
      messages: { select: { id: true, readAt: true, patient: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const result = broadcasts.map((b: any) => ({
    id: b.id,
    title: b.title,
    content: b.content,
    audience: b.audience,
    recipientCount: b.recipientCount,
    readCount: b.messages.filter((m: any) => m.readAt).length,
    recipients: b.messages.map((m: any) => ({
      name: `${m.patient.firstName} ${m.patient.lastName}`,
      read: Boolean(m.readAt),
    })),
    sentBy: `${b.sentBy.firstName} ${b.sentBy.lastName}`,
    createdAt: b.createdAt,
  }));

  return NextResponse.json(result);
}

// POST — send broadcast to all patients or selected patients
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, content, audience = "all", patientIds = [], notify = true } = await req.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content required" }, { status: 400 });
  }
  if (audience === "selected" && !patientIds.length) {
    return NextResponse.json({ error: "patientIds required for selected audience" }, { status: 400 });
  }

  // Resolve recipients
  const where: any = { role: "PATIENT" };
  if (audience === "selected") where.id = { in: patientIds };
  const patients = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  if (!patients.length) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  const senderId = (session.user as any).id;

  const broadcast = await (prisma as any).clinicBroadcast.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      sentById: senderId,
      audience,
      recipientCount: patients.length,
    },
  });

  // Fan-out: one ClinicMessage per recipient
  await (prisma as any).clinicMessage.createMany({
    data: patients.map((p) => ({
      patientId: p.id,
      senderId,
      senderRole: "staff",
      kind: "broadcast",
      title: title.trim(),
      content: content.trim(),
      broadcastId: broadcast.id,
    })),
  });

  // Notify each patient (email/WhatsApp per preference) — fire-and-forget batches
  if (notify) {
    const appUrl = process.env.NEXTAUTH_URL || "https://bpr.rehab";
    const preview = content.trim().slice(0, 100);
    Promise.allSettled(
      patients.map((p) =>
        notifyPatient({
          patientId: p.id,
          plainMessage: `Notice from your clinic — ${title.trim()}: "${preview}" Read in your portal: ${appUrl}/dashboard/questions`,
          plainMessagePt: `Aviso da sua clínica — ${title.trim()}: "${preview}" Leia no portal: ${appUrl}/dashboard/questions`,
        })
      )
    ).catch(() => {});
  }

  return NextResponse.json(
    { id: broadcast.id, recipientCount: patients.length },
    { status: 201 }
  );
}

// DELETE — remove a broadcast (and its fan-out messages)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { broadcastId } = await req.json();
  if (!broadcastId) return NextResponse.json({ error: "broadcastId required" }, { status: 400 });

  await (prisma as any).clinicMessage.deleteMany({ where: { broadcastId } });
  await (prisma as any).clinicBroadcast.delete({ where: { id: broadcastId } });
  return NextResponse.json({ deleted: true });
}
