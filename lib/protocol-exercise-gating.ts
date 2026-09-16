import { prisma } from "@/lib/db";

// Assigning a protocol also prescribes each linked exercise as a standalone
// ExercisePrescription (so it shows in the app's Exercises tab). Those copies
// carry no week, so without this every exercise of a months-long plan would
// reach the patient on day one — while the plan itself is released week by
// week. Same visibility rules as GET /api/patient/protocol.

type GatingItem = { exerciseId: string | null; hiddenFromPatient: boolean; startWeek: number | null };
type GatingProtocol = {
  releasedThroughWeek: number | null;
  items: GatingItem[];
  packages: { isPaid: boolean }[];
};

export interface ProtocolExerciseVisibility {
  /** Exercises the patient can see right now in a sent protocol. */
  visible: string[];
  /** Exercises only a sent protocol's hidden/unreleased items link. */
  gated: string[];
}

export function exerciseVisibility(protocols: GatingProtocol[]): ProtocolExerciseVisibility {
  const unseen = new Set<string>();
  const seen = new Set<string>();
  for (const p of protocols) {
    const paymentRequired = Boolean(p.packages?.[0] && !p.packages[0].isPaid);
    for (const it of p.items) {
      if (!it.exerciseId) continue;
      const visible =
        !paymentRequired &&
        !it.hiddenFromPatient &&
        (p.releasedThroughWeek == null || (it.startWeek || 1) <= p.releasedThroughWeek);
      (visible ? seen : unseen).add(it.exerciseId);
    }
  }
  for (const id of seen) unseen.delete(id);
  return { visible: [...seen], gated: [...unseen] };
}

/** The patient's exercise visibility across her sent protocols. */
export async function protocolExerciseVisibility(patientId: string): Promise<ProtocolExerciseVisibility> {
  const protocols = await (prisma as any).treatmentProtocol.findMany({
    where: { patientId, status: "SENT_TO_PATIENT" },
    select: {
      releasedThroughWeek: true,
      items: { select: { exerciseId: true, hiddenFromPatient: true, startWeek: true } },
      packages: { select: { isPaid: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return exerciseVisibility(protocols);
}

/**
 * Where-clause fragment for the prescriptions a patient may see:
 * - created by assigning a protocol (`protocolId` set) → only while a sent
 *   protocol still shows that exercise, so archiving a plan or pulling it back
 *   to draft takes its exercises with it (activity 46);
 * - prescribed on its own → visible unless the exercise exists only in weeks a
 *   sent protocol keeps hidden (activity 45).
 */
export function visiblePrescriptionWhere({ visible, gated }: ProtocolExerciseVisibility) {
  return {
    OR: [
      { protocolId: null, ...(gated.length ? { exerciseId: { notIn: gated } } : {}) },
      { protocolId: { not: null }, exerciseId: { in: visible } },
    ],
  };
}

/** The same filter, straight from the patient id. */
export async function patientPrescriptionWhere(patientId: string) {
  return visiblePrescriptionWhere(await protocolExerciseVisibility(patientId));
}
