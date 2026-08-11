// Dispatch due scheduled broadcasts (fan-out ClinicMessage + notify patients).
// Called lazily from broadcast/messages APIs and from /api/cron/dispatch-broadcasts.
import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";

export async function dispatchDueBroadcasts(): Promise<number> {
  const due = await (prisma as any).clinicBroadcast.findMany({
    where: { status: "scheduled", scheduledFor: { lte: new Date() } },
  });
  if (!due.length) return 0;

  let dispatched = 0;
  const appUrl = process.env.NEXTAUTH_URL || "https://bpr.clinic";

  for (const b of due) {
    // Claim atomically to avoid double dispatch from concurrent calls
    const claimed = await (prisma as any).clinicBroadcast.updateMany({
      where: { id: b.id, status: "scheduled" },
      data: { status: "sent", sentAt: new Date() },
    });
    if (!claimed.count) continue;

    // Resolve recipients
    const where: any = { role: "PATIENT", isActive: true };
    if (b.audience === "selected") where.id = { in: b.targetIds || [] };
    const patients = await prisma.user.findMany({ where, select: { id: true } });

    if (patients.length) {
      await (prisma as any).clinicMessage.createMany({
        data: patients.map((p) => ({
          patientId: p.id,
          senderId: b.sentById,
          senderRole: "staff",
          kind: "broadcast",
          title: b.title,
          content: b.content,
          broadcastId: b.id,
        })),
      });

      await (prisma as any).clinicBroadcast.update({
        where: { id: b.id },
        data: { recipientCount: patients.length },
      });

      const preview = b.content.slice(0, 100);
      Promise.allSettled(
        patients.map((p) =>
          notifyPatient({
            patientId: p.id,
            plainMessage: `Notice from your clinic — ${b.title}: "${preview}" Read in your portal: ${appUrl}/dashboard/questions`,
            plainMessagePt: `Aviso da sua clínica — ${b.title}: "${preview}" Leia no portal: ${appUrl}/dashboard/questions`,
          })
        )
      ).catch(() => {});
    }
    dispatched++;
  }
  return dispatched;
}
