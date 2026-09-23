import { Prisma, AlertPriority, AlertStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * What the automation engine raises for the therapist.
 *
 * An alert is internal — it is not a message to the patient — so a rule may
 * create one on its own. Anything that would reach the patient goes to the
 * approval queue instead (activity 072, decision 3). That split is what lets
 * the engine stay useful while nothing is sent automatically: the therapist
 * sees what is happening even though no message went out.
 */
export interface CreateAlertInput {
  clinicId: string;
  /** The patient the alert is about (User with role PATIENT). */
  patientId: string;
  ruleCode: string;
  /**
   * The window this alert belongs to — a day (`2026-09-23`), a week
   * (`2026-W39`), or whatever the rule's cadence is. Two runs of the same rule
   * inside the same window produce one alert, not two.
   */
  window: string;
  title: string;
  priority?: AlertPriority;
  details?: Prisma.InputJsonValue;
}

/** Declaration order of the enum, so "worse than" is a comparison, not a guess. */
const RANK: Record<AlertPriority, number> = {
  [AlertPriority.LOW]: 0,
  [AlertPriority.MEDIUM]: 1,
  [AlertPriority.HIGH]: 2,
  [AlertPriority.URGENT]: 3,
};

/**
 * The clinic comes first and is part of the key, not decoration.
 *
 * Without it, a call made on behalf of one clinic with another clinic's
 * patient id lands on that other clinic's row — and since an escalation
 * *writes*, it would rewrite a tenant's alert and wipe the resolution someone
 * there had already recorded. A "for each clinic, for each patient" loop is
 * exactly where that pairing gets mismatched.
 */
export function alertDedupeKey(
  clinicId: string,
  ruleCode: string,
  patientId: string,
  window: string
): string {
  return `${clinicId}:${ruleCode}:${patientId}:${window}`;
}

/**
 * Creates the alert, or returns the one already there for this rule, patient
 * and window.
 *
 * Idempotent through the unique `dedupeKey` rather than a read-then-write: a
 * rule evaluated by two workers at once would both pass the same "does it
 * exist?" check and both would insert. Here the database decides.
 *
 * `createMany({ skipDuplicates: true })` rather than catching P2002, because
 * this client runs with `log: ['warn', 'error']` — every deduplicated alert
 * would write "Unique constraint failed" to the production log. A rule that
 * runs every five minutes would bury the real errors under its own noise.
 */
export async function createAlert(
  input: CreateAlertInput
): Promise<{ created: boolean; escalated?: boolean; refreshed?: boolean; alertId: string }> {
  const dedupeKey = alertDedupeKey(input.clinicId, input.ruleCode, input.patientId, input.window);

  const priority = input.priority ?? AlertPriority.MEDIUM;

  const { count } = await prisma.alert.createMany({
    data: [
      {
        clinicId: input.clinicId,
        patientId: input.patientId,
        ruleCode: input.ruleCode,
        title: input.title,
        priority,
        details: input.details,
        dedupeKey,
      },
    ],
    skipDuplicates: true,
  });

  const alert = await prisma.alert.findUniqueOrThrow({
    where: { dedupeKey },
    select: { id: true, priority: true, status: true, title: true },
  });

  if (count === 1) return { created: true, alertId: alert.id };

  // Deduplicating must not mean ignoring. If the same rule fires again in the
  // same window and things got worse — adherence from 40% to 5%, pain still
  // climbing — keeping the first alert's LOW and its stale figures would hide
  // exactly the case worth seeing. So an escalation rewrites the alert and
  // reopens it: a worse situation deserves a fresh look, even from someone who
  // already acknowledged the milder one. A repeat at the same or lower
  // priority changes nothing.
  if (RANK[priority] > RANK[alert.priority]) {
    // Scoped by clinic even though the key already carries it: this is the one
    // write on the deduplication path, and belt and braces is cheap here.
    const escalated = await prisma.alert.updateMany({
      where: { id: alert.id, clinicId: input.clinicId },
      data: {
        priority,
        title: input.title,
        details: input.details,
        status: AlertStatus.OPEN,
        ackById: null,
        ackAt: null,
        resolvedById: null,
        resolvedAt: null,
      },
    });
    if (escalated.count === 1) return { created: false, escalated: true, alertId: alert.id };
  }

  // Not worse enough to reopen, but the figures moved: the therapist reads the
  // title, and "1 activity missed today" on a patient who has now missed three
  // is simply false. Refreshed in place, without dragging a resolved alert
  // back open — that is what an escalation is for.
  if (alert.title !== input.title) {
    await prisma.alert.updateMany({
      where: { id: alert.id, clinicId: input.clinicId },
      data: { title: input.title, details: input.details },
    });
    return { created: false, refreshed: true, alertId: alert.id };
  }

  return { created: false, alertId: alert.id };
}
