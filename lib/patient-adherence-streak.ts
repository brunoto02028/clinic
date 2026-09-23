import { prisma } from "@/lib/db";
import { ADHERENCE_CONFIG } from "@/lib/adherence-config";

// "Days without activity" for a patient — activity 071. Deliberately no new
// table: ExerciseCompletionLog is already the source of truth for "did they
// do it", so this is computed on demand from it. If this ever needs to be
// faster than a per-patient query allows at scale, the natural next step is
// a materialised counter — but nothing here assumes that; the function
// signature and its one caller (getClinicPatientsFallingBehind) are the only
// places that would need to change.

// Same rule as currentWeekOf() in lib/patient-daily-adherence.ts and
// app/dashboard/treatment/page.tsx — duplicated rather than imported because
// that one isn't exported; keep both in sync if the rule ever changes.
function currentWeekOf(proto: { startDate: Date | null; createdAt: Date }, at: Date): number {
  const effectiveStartDate = proto.startDate || proto.createdAt;
  return Math.max(1, Math.floor((at.getTime() - effectiveStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(earlier: Date, later: Date): number {
  const diff = Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export interface AdherenceStreak {
  /** Days since the most recent exercise log, or since the protocol's earliest currently-liberated item became available if never logged. */
  daysWithoutActivity: number;
  /** True once daysWithoutActivity >= the configured (or passed) threshold. */
  fallingBehind: boolean;
}

/**
 * Null means "nothing to judge" — no SENT_TO_PATIENT protocol has any
 * HOME_EXERCISE/HOME_CARE item liberated as of `asOf`, so this patient
 * should never be flagged as behind (there's nothing for them to have done).
 */
export async function getDaysWithoutActivity(
  patientId: string,
  asOf: Date,
  thresholdDays: number = ADHERENCE_CONFIG.fallingBehindThresholdDays,
  knownClinicId?: string
): Promise<AdherenceStreak | null> {
  let clinicId = knownClinicId;
  if (!clinicId) {
    const patient = await prisma.user.findUnique({ where: { id: patientId }, select: { clinicId: true } });
    if (!patient?.clinicId) return null;
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
        select: { id: true, itemType: true, hiddenFromPatient: true, startWeek: true, endWeek: true },
      },
    },
  });

  const allProtocolItemIds: string[] = [];
  let earliestLiberatedSince: Date | null = null;
  let hasLiberatedItem = false;

  for (const proto of protocols) {
    const paymentRequired = Boolean(proto.packages?.[0] && !proto.packages[0].isPaid);
    // Must come after this guard: a completion log against a payment-gated
    // protocol's item (its own patient-facing PATCH route doesn't check
    // isPaid either, so a stale/cached itemId can still log one) must not
    // count as "recent activity" — that would mask a patient who's actually
    // behind on a different, paid protocol. Caught in code review.
    if (paymentRequired) continue;
    for (const item of proto.items) allProtocolItemIds.push(item.id);

    const effectiveStart = proto.startDate || proto.createdAt;
    const currentWeek = currentWeekOf(proto, asOf);

    for (const item of proto.items) {
      if (item.hiddenFromPatient) continue;
      if (item.itemType !== "HOME_EXERCISE" && item.itemType !== "HOME_CARE") continue;
      const startWeek = item.startWeek || 1;
      if (proto.releasedThroughWeek != null && startWeek > proto.releasedThroughWeek) continue;
      if (!(currentWeek >= startWeek && (item.endWeek == null || currentWeek <= item.endWeek))) continue;

      hasLiberatedItem = true;
      const itemAvailableSince = new Date(effectiveStart.getTime() + (startWeek - 1) * 7 * 24 * 60 * 60 * 1000);
      if (!earliestLiberatedSince || itemAvailableSince < earliestLiberatedSince) {
        earliestLiberatedSince = itemAvailableSince;
      }
    }
  }

  if (!hasLiberatedItem) return null; // nothing expected — not "behind", just nothing to do yet

  const lastLog = allProtocolItemIds.length
    ? await prisma.exerciseCompletionLog.findFirst({
        where: { patientId, protocolItemId: { in: allProtocolItemIds } },
        orderBy: { completedDate: "desc" },
        select: { completedDate: true },
      })
    : null;

  const daysWithoutActivity = lastLog
    ? daysBetween(lastLog.completedDate, asOf)
    : daysBetween(earliestLiberatedSince as Date, asOf);

  return { daysWithoutActivity, fallingBehind: daysWithoutActivity >= thresholdDays };
}
