import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { seedDefaultTemplates } from "@/lib/email-templates";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";
const MAX_NOTIFIED_PER_SLOT = 5;

/**
 * Called whenever an Appointment is cancelled. Finds ACTIVE waitlist entries
 * that match the freed-up slot (same clinic, same treatment type, optional
 * therapist preference, optional date window) and notifies them that the
 * slot is available — first come, first served.
 */
export async function notifyWaitlistForCancelledAppointment(appointment: {
  id: string;
  clinicId: string | null;
  therapistId: string;
  treatmentType: string;
  dateTime: Date;
}): Promise<{ matched: number; notified: number }> {
  try {
    const candidates = await (prisma as any).waitlistEntry.findMany({
      where: {
        status: "ACTIVE",
        treatmentType: appointment.treatmentType,
        ...(appointment.clinicId ? { OR: [{ clinicId: appointment.clinicId }, { clinicId: null }] } : {}),
        OR: [{ therapistId: null }, { therapistId: appointment.therapistId }],
        AND: [
          { OR: [{ preferredFrom: null }, { preferredFrom: { lte: appointment.dateTime } }] },
          { OR: [{ preferredTo: null }, { preferredTo: { gte: appointment.dateTime } }] },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: MAX_NOTIFIED_PER_SLOT,
    });

    if (!candidates.length) return { matched: 0, notified: 0 };

    await seedDefaultTemplates().catch(() => {});

    const dateStr = appointment.dateTime.toLocaleDateString("en-GB", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const timeStr = appointment.dateTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    let notified = 0;
    for (const entry of candidates) {
      try {
        await notifyPatient({
          patientId: entry.patientId,
          emailTemplateSlug: "WAITLIST_SLOT_AVAILABLE",
          emailVars: {
            treatmentType: appointment.treatmentType,
            appointmentDate: dateStr,
            appointmentTime: timeStr,
            portalUrl: `${BASE_URL}/dashboard/appointments`,
          },
          plainMessage: `A slot for ${appointment.treatmentType} just opened up on ${dateStr} at ${timeStr}. Book it in your portal before it's gone!`,
          plainMessagePt: `Uma vaga para ${appointment.treatmentType} acabou de abrir em ${dateStr} às ${timeStr}. Reserve no seu portal antes que acabe!`,
        });

        await (prisma as any).waitlistEntry.update({
          where: { id: entry.id },
          data: { status: "NOTIFIED", notifiedAt: new Date(), notifiedForSlot: appointment.dateTime },
        });
        notified++;
      } catch (err) {
        console.error("[waitlist] Failed to notify entry", entry.id, err);
      }
    }

    return { matched: candidates.length, notified };
  } catch (err) {
    console.error("[waitlist] notifyWaitlistForCancelledAppointment error:", err);
    return { matched: 0, notified: 0 };
  }
}
