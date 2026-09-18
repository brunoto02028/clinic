import { prisma } from "@/lib/db";
import { exerciseVisibility } from "@/lib/protocol-exercise-gating";

// What's on a patient's "Today" card, computed server-side — same rules as
// GET /api/patient/protocol + app/dashboard/treatment/page.tsx's
// todayProtocolTasks/todayPrescriptionTasks, so activity 49's report never
// disagrees with what the patient themselves sees. See specs/49-relatorio-adesao-diaria.

export type ExpectedItem = { id: string; title: string; kind: "protocol" | "prescription" };

export interface DailyAdherence {
  expected: ExpectedItem[];
  completed: ExpectedItem[];
  allDone: boolean;
}

// "Week 1" starts on the protocol's startDate, not the surgery date — same
// rule as currentWeekOf() in app/dashboard/treatment/page.tsx.
function currentWeekOf(proto: { startDate: Date | null; createdAt: Date }, at: Date): number {
  const effectiveStartDate = proto.startDate || proto.createdAt;
  return Math.max(1, Math.floor((at.getTime() - effectiveStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * What a patient's protocols + standalone prescriptions expect on `date`, and what's already logged.
 * `knownClinicId`: pass it when the caller already has it (e.g. iterating a
 * clinic's own patient list) to skip the lookup below — saves a redundant
 * per-patient query in loops like getClinicDailyAdherence's.
 */
export async function getExpectedToday(patientId: string, date: Date, knownClinicId?: string): Promise<DailyAdherence> {
  const dayStart = startOfDay(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Both queries below used to filter by patientId alone. A stray
  // TreatmentProtocol/ExercisePrescription row belonging to a different
  // clinic (bad data from elsewhere) would still surface here as something
  // "expected today" — confirmed live: the Exercises tab (correctly scoped
  // by clinicId) showed 0 exercises for a patient while this function
  // showed a pending item from another clinic's leftover prescription.
  let clinicId = knownClinicId;
  if (!clinicId) {
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    if (!patient?.clinicId) return { expected: [], completed: [], allDone: false };
    clinicId = patient.clinicId;
  }

  const protocols = await (prisma as any).treatmentProtocol.findMany({
    where: { patientId, clinicId, status: "SENT_TO_PATIENT" },
    select: {
      startDate: true,
      createdAt: true,
      releasedThroughWeek: true,
      packages: { select: { isPaid: true }, orderBy: { createdAt: "desc" }, take: 1 },
      items: {
        select: {
          id: true,
          title: true,
          itemType: true,
          exerciseId: true,
          hiddenFromPatient: true,
          startWeek: true,
          endWeek: true,
        },
      },
    },
  });

  const { visible: visibleExerciseIds } = exerciseVisibility(protocols);
  const protocolExerciseIds = new Set(
    protocols.flatMap((p: any) => p.items.map((it: any) => it.exerciseId).filter(Boolean))
  );

  const expected: ExpectedItem[] = [];
  const protocolItemIds: string[] = [];

  for (const proto of protocols) {
    const paymentRequired = Boolean(proto.packages?.[0] && !proto.packages[0].isPaid);
    if (paymentRequired) continue;
    const currentWeek = currentWeekOf(proto, date);
    for (const item of proto.items) {
      if (item.hiddenFromPatient) continue;
      if (proto.releasedThroughWeek != null && (item.startWeek || 1) > proto.releasedThroughWeek) continue;
      if (item.itemType !== "HOME_EXERCISE" && item.itemType !== "HOME_CARE") continue;
      const startWeek = item.startWeek || 1;
      if (!(currentWeek >= startWeek && (item.endWeek == null || currentWeek <= item.endWeek))) continue;
      expected.push({ id: item.id, title: item.title, kind: "protocol" });
      protocolItemIds.push(item.id);
    }
  }

  const prescriptions = await prisma.exercisePrescription.findMany({
    where: {
      patientId,
      clinicId,
      isActive: true,
      OR: [
        { protocolId: null, exerciseId: { notIn: [...protocolExerciseIds] as string[] } },
        { protocolId: { not: null }, exerciseId: { in: visibleExerciseIds } },
      ],
    },
    select: { id: true, exercise: { select: { id: true, name: true } } },
  });

  const prescriptionIds: string[] = [];
  for (const p of prescriptions) {
    if (protocolExerciseIds.has(p.exercise?.id)) continue; // standalone copy of a protocol exercise
    expected.push({ id: p.id, title: p.exercise?.name || "Exercise", kind: "prescription" });
    prescriptionIds.push(p.id);
  }

  if (expected.length === 0) {
    return { expected: [], completed: [], allDone: false };
  }

  const logs = await prisma.exerciseCompletionLog.findMany({
    where: {
      patientId,
      completedDate: { gte: dayStart, lt: dayEnd },
      OR: [
        { protocolItemId: { in: protocolItemIds } },
        { exercisePrescriptionId: { in: prescriptionIds } },
      ],
    },
    select: { protocolItemId: true, exercisePrescriptionId: true },
  });
  const completedIds = new Set(logs.map((l) => l.protocolItemId || l.exercisePrescriptionId));

  const completed = expected.filter((e) => completedIds.has(e.id));
  return { expected, completed, allDone: completed.length === expected.length };
}
