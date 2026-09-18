import { prisma } from "@/lib/db";
import { getExpectedToday, type ExpectedItem } from "@/lib/patient-daily-adherence";

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
