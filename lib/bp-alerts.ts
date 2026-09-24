import { prisma } from "@/lib/db";
import { notifyPatient } from "@/lib/notify-patient";
import { sendAdminAlert } from "@/lib/admin-alert-email";
import { escapeHtml } from "@/lib/admin-notify-email";
import { getBpThresholds, classify } from "@/lib/automation/bp-thresholds";
import { getExerciseBpLimits, evaluateClearance } from "@/lib/automation/exercise-bp";

/**
 * What happens after a blood-pressure reading is stored, whoever stored it.
 *
 * This lived inside the route the patient's app posts to, and for a while that
 * was the only way a reading could arrive. It is not any more: the Withings
 * webhook writes readings (T-9), the clinic's own cuff writes them through
 * session attribution (T-14), and a therapist assigns them by hand from the
 * inbox (T-15). None of those alerted anyone — so a reading of 210/130 taken
 * on the reception cuff entered the record in silence, while the app told the
 * patient, on the screen that blocks their session, "your therapist has been
 * notified". Nobody had been.
 *
 * Two independent questions about the same numbers, as elsewhere in this
 * activity: is this a reading the clinic must see (T-3 thresholds), and does
 * today's session still happen (T-11 limits)? Either one reaching its line
 * sends the clinic one e-mail — never two for one reading.
 *
 * The patient is written to only in a crisis. That exception is the one the
 * clinic approved, because its message is "go to A&E now" and waiting for
 * someone to open the admin is not acceptable.
 */

export interface RecordedReading {
  patientId: string;
  clinicId: string | null;
  systolic: number;
  diastolic: number;
  measuredAt?: Date;
  /** How it got here, for the line the clinic reads. */
  via?: "app" | "device" | "clinic-device" | "assigned";
}

export interface ReadingVerdict {
  isAlert: boolean;
  isCrisis: boolean;
  blocksTraining: boolean;
  classification: string;
}

const VIA_LABEL: Record<NonNullable<RecordedReading["via"]>, string> = {
  app: "Logged by the patient",
  device: "From the patient's own device",
  "clinic-device": "Measured on the clinic's device",
  assigned: "Assigned from the measurements inbox",
};

export async function afterBloodPressureRecorded(r: RecordedReading): Promise<ReadingVerdict> {
  const { patientId, clinicId, systolic: sys, diastolic: dia } = r;
  const measuredAt = r.measuredAt ?? new Date();

  const [thresholds, exerciseLimits, patient] = await Promise.all([
    getBpThresholds(clinicId),
    getExerciseBpLimits(clinicId),
    prisma.user.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true } }),
  ]);

  const { isCrisis, isAlert, classification } = classify(sys, dia, thresholds);
  const clearance = evaluateClearance({ systolic: sys, diastolic: dia, measuredAt }, exerciseLimits);
  const blocksTraining = clearance.blocked;

  if (!isAlert && !blocksTraining) {
    return { isAlert, isCrisis, blocksTraining, classification };
  }

  const BASE = process.env.NEXTAUTH_URL || "https://bpr.clinic";

  if (isCrisis) {
    notifyPatient({
      patientId,
      emailTemplateSlug: "BP_HIGH_ALERT",
      emailVars: {
        bpReading: `${sys}/${dia} mmHg`,
        readingDate: measuredAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        classification,
        portalUrl: `${BASE}/dashboard/blood-pressure`,
      },
      plainMessage: `🚨 HYPERTENSIVE CRISIS: Your reading of ${sys}/${dia} mmHg requires IMMEDIATE medical attention. Call 999/112 or go to A&E now.`,
      plainMessagePt: `🚨 CRISE HIPERTENSIVA: Sua leitura de ${sys}/${dia} mmHg requer atenção médica IMEDIATA. Ligue 999/112 ou vá ao pronto-socorro agora.`,
    }).catch((err) => console.error("[bp-alerts] patient notification error:", err));
  }

  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "A patient";
  sendAdminAlert({
    clinicId,
    subject: isCrisis
      ? `🚨 HYPERTENSIVE CRISIS: ${patientName} — ${sys}/${dia} mmHg`
      : blocksTraining && !isAlert
        ? `🚨 Session blocked: ${patientName} — ${sys}/${dia} mmHg`
        : `🚨 High Blood Pressure Reading: ${patientName} — ${sys}/${dia} mmHg`,
    title: isCrisis
      ? "Hypertensive Crisis Reading"
      : blocksTraining && !isAlert
        ? "Session Blocked by Blood Pressure"
        : "High Blood Pressure Reading",
    intro: `<strong>${escapeHtml(patientName)}</strong> just logged a reading requiring attention.`,
    rows: [
      { label: "Reading", value: `${sys}/${dia} mmHg` },
      { label: "Classification", value: classification },
      ...(r.via ? [{ label: "Source", value: VIA_LABEL[r.via] }] : []),
      ...(blocksTraining
        ? [
            {
              label: "Exercise",
              value: `Today's session is blocked — above ${exerciseLimits.blockSystolic}/${exerciseLimits.blockDiastolic} mmHg. Review and contact the patient.`,
            },
          ]
        : []),
      { label: "Date", value: measuredAt.toLocaleString("en-GB") },
    ],
    ctaUrl: `${BASE}/admin/patients/${patientId}`,
    accentColor: "#dc2626",
  }).catch((err) => console.error("[bp-alerts] admin alert error:", err));

  return { isAlert, isCrisis, blocksTraining, classification };
}
