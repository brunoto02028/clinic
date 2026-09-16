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

/**
 * Exercise ids linked by a protocol item the patient can't see yet (hidden,
 * beyond the released week, or behind an unpaid package) and by no item she
 * can see.
 */
export function gatedExerciseIds(protocols: GatingProtocol[]): Set<string> {
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
  return unseen;
}

/** The patient's gated exercise ids, across her sent protocols. */
export async function gatedProtocolExerciseIds(patientId: string): Promise<Set<string>> {
  const protocols = await (prisma as any).treatmentProtocol.findMany({
    where: { patientId, status: "SENT_TO_PATIENT" },
    select: {
      releasedThroughWeek: true,
      items: { select: { exerciseId: true, hiddenFromPatient: true, startWeek: true } },
      packages: { select: { isPaid: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  return gatedExerciseIds(protocols);
}
