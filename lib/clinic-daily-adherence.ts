import { prisma } from "@/lib/db";
import { getExpectedToday, type ExpectedItem } from "@/lib/patient-daily-adherence";
import { getDaysWithoutActivity } from "@/lib/patient-adherence-streak";
import { ADHERENCE_CONFIG } from "@/lib/adherence-config";

export interface PatientSummary {
  patientId: string;
  name: string;
  missingItems: ExpectedItem[];
}

export interface ClinicDailyAdherence {
  completed: PatientSummary[];
  missing: PatientSummary[];
}

/** Every patient of a clinic with a live protocol, split by whether they finished today's items. */
export async function getClinicDailyAdherence(clinicId: string, date: Date): Promise<ClinicDailyAdherence> {
  const patients = await prisma.user.findMany({
    where: {
      clinicId,
      role: "PATIENT",
      protocolsAsPatient: { some: { status: "SENT_TO_PATIENT" } },
    },
    select: { id: true, firstName: true, lastName: true },
  });

  const completed: PatientSummary[] = [];
  const missing: PatientSummary[] = [];

  await Promise.all(
    patients.map(async (patient) => {
      const adherence = await getExpectedToday(patient.id, date, clinicId);
      if (adherence.expected.length === 0) return; // nothing scheduled today — out of the report
      const summary: PatientSummary = {
        patientId: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        missingItems: adherence.expected.filter((e) => !adherence.completed.some((c) => c.id === e.id)),
      };
      (adherence.allDone ? completed : missing).push(summary);
    })
  );

  return { completed, missing };
}

export interface FallingBehindPatient {
  patientId: string;
  name: string;
  daysWithoutActivity: number;
  /** Any non-empty ProtocolItem.patientNotes on this patient's active protocols — "seen" tracking is T-4's job, this is just presence. */
  hasNote: boolean;
}

/**
 * Every patient of a clinic with a live protocol who has gone
 * `thresholdDays` (config default, overridable) or more without any
 * exercise log while something was liberated for them. See
 * lib/patient-adherence-streak.ts for what "liberated" means.
 */
export async function getClinicPatientsFallingBehind(
  clinicId: string,
  date: Date,
  thresholdDays: number = ADHERENCE_CONFIG.fallingBehindThresholdDays
): Promise<FallingBehindPatient[]> {
  const patients = await prisma.user.findMany({
    where: {
      clinicId,
      role: "PATIENT",
      protocolsAsPatient: { some: { status: "SENT_TO_PATIENT" } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      // Not filtered by status here (unlike the `where` above, which
      // correctly scopes to SENT_TO_PATIENT for deciding who's "behind") —
      // a note from a since-archived protocol must still surface (Bruno,
      // 23/09/2026: "sempre deixar arquivado visivel para a clinic").
      protocolsAsPatient: {
        select: { items: { select: { patientNotes: true } } },
      },
    },
  });

  const results = await Promise.all(
    patients.map(async (patient) => {
      const streak = await getDaysWithoutActivity(patient.id, date, thresholdDays, clinicId);
      if (!streak || !streak.fallingBehind) return null;
      const hasNote = patient.protocolsAsPatient.some((p) =>
        p.items.some((it) => Boolean(it.patientNotes && it.patientNotes.trim()))
      );
      const summary: FallingBehindPatient = {
        patientId: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        daysWithoutActivity: streak.daysWithoutActivity,
        hasNote,
      };
      return summary;
    })
  );

  return results.filter((r): r is FallingBehindPatient => r !== null);
}
