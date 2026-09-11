import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { dispatchDueBroadcasts } from "@/lib/broadcast-dispatch";
import { getActor, requireStaff, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// SECURITY: every query below is scoped to the caller's own tenant (clinicId).
// Before this fix, GET/POST/DELETE had no tenant filter at all — any staff
// member of ANY clinic/studio could read every tenant's broadcast history,
// send a broadcast to every PATIENT row in the whole database regardless of
// tenant, and delete another tenant's broadcasts. ClinicBroadcast/ClinicMessage
// already had a nullable clinicId column that was simply never set/filtered.

// GET — broadcast history with read stats (own tenant only)
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    // Lazy-dispatch any scheduled broadcasts that are due (global maintenance
    // step — dispatchDueBroadcasts scopes each broadcast's recipients to its
    // OWN clinicId internally, not to this caller's tenant).
    await dispatchDueBroadcasts().catch(() => {});

    const broadcasts = await (prisma as any).clinicBroadcast.findMany({
      where: { clinicId },
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
    status: b.status,
    scheduledFor: b.scheduledFor,
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
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/broadcasts] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — send a broadcast to all or selected patients of the CALLER'S tenant only.
export async function POST(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const { title, content, audience = "all", patientIds = [], notify = true, scheduledFor } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "title and content required" }, { status: 400 });
    }
    if (audience === "selected" && !patientIds.length) {
      return NextResponse.json({ error: "patientIds required for selected audience" }, { status: 400 });
    }

    // Scheduled for the future — store and dispatch later
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
      const scheduled = await (prisma as any).clinicBroadcast.create({
        data: {
          clinicId,
          title: title.trim(),
          content: content.trim(),
          sentById: actor.userId,
          audience,
          status: "scheduled",
          scheduledFor: new Date(scheduledFor),
          targetIds: audience === "selected" ? patientIds : [],
        },
      });
      return NextResponse.json(
        { id: scheduled.id, scheduled: true, scheduledFor: scheduled.scheduledFor },
        { status: 201 }
      );
    }

    // Resolve recipients — scoped to this tenant. `selected` ids from another
    // tenant are silently excluded rather than trusted from client input.
    const where: any = { role: "PATIENT", clinicId };
    if (audience === "selected") where.id = { in: patientIds };
    const patients = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    if (!patients.length) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 });
    }

    const senderId = actor.userId;

    const broadcast = await (prisma as any).clinicBroadcast.create({
      data: {
        clinicId,
        title: title.trim(),
        content: content.trim(),
        sentById: senderId,
        audience,
        recipientCount: patients.length,
        status: "sent",
        sentAt: new Date(),
      },
    });

    // Fan-out: one ClinicMessage per recipient
    await (prisma as any).clinicMessage.createMany({
      data: patients.map((p) => ({
        clinicId,
        patientId: p.id,
        senderId,
        senderRole: "staff",
        kind: "broadcast",
        title: title.trim(),
        content: content.trim(),
        broadcastId: broadcast.id,
      })),
    });

    // Notify each patient (email/WhatsApp per preference) — fire-and-forget
    if (notify) {
      const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";
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
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/broadcasts] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// DELETE — remove a broadcast (and its fan-out messages). Ownership is checked
// server-side: a broadcastId from another tenant answers 404, never deletes.
export async function DELETE(req: NextRequest) {
  try {
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requireStaff(actor);
    const { clinicId } = tenantWhere(actor);

    const { broadcastId } = await req.json();
    if (!broadcastId) return NextResponse.json({ error: "broadcastId required" }, { status: 400 });

    const owned = await (prisma as any).clinicBroadcast.findUnique({ where: { id: broadcastId }, select: { clinicId: true } });
    if (!owned || owned.clinicId !== clinicId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await (prisma as any).clinicMessage.deleteMany({ where: { broadcastId } });
    await (prisma as any).clinicBroadcast.delete({ where: { id: broadcastId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/broadcasts] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}
