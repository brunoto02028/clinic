import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { pushVagaNaFila } from "@/lib/push-notify";
import { seedDefaultTemplates } from "@/lib/email-templates";
import { CLINIC_TIMEZONE } from "@/lib/clinic-timezone";

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

    // O fuso da clínica, e não o do contêiner (que é UTC): sem ele a vaga das
    // 10:00 era anunciada como 09:00 durante os sete meses de horário de verão.
    const dateStr = appointment.dateTime.toLocaleDateString("en-GB", {
      timeZone: CLINIC_TIMEZONE,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = appointment.dateTime.toLocaleTimeString("en-GB", { timeZone: CLINIC_TIMEZONE, hour: "2-digit", minute: "2-digit" });

    let notified = 0;
    for (const entry of candidates) {
      try {
        /**
         * **No app e por e-mail, sempre** (decisão do Bruno, 29/09/2026).
         *
         * `notifyPatient` escolhe **um** canal pela preferência da pessoa — e
         * quem tem WhatsApp ou SMS marcado nunca recebia o e-mail. Para uma
         * vaga perecível isso é o pior dos mundos: o canal preferido pode
         * falhar em silêncio e ninguém fica sabendo.
         *
         * `forceChannel: "EMAIL"` garante a carta; o push garante o telefone.
         * O push vem primeiro porque é o que chega em segundos.
         */
        await pushVagaNaFila(entry.patientId);

        await notifyPatient({
          patientId: entry.patientId,
          forceChannel: "EMAIL",
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
