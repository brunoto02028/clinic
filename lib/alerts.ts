import { Prisma, AlertPriority } from "@prisma/client";
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

export function alertDedupeKey(ruleCode: string, patientId: string, window: string): string {
  return `${ruleCode}:${patientId}:${window}`;
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
): Promise<{ created: boolean; alertId: string }> {
  const dedupeKey = alertDedupeKey(input.ruleCode, input.patientId, input.window);

  const { count } = await prisma.alert.createMany({
    data: [
      {
        clinicId: input.clinicId,
        patientId: input.patientId,
        ruleCode: input.ruleCode,
        title: input.title,
        priority: input.priority ?? AlertPriority.MEDIUM,
        details: input.details,
        dedupeKey,
      },
    ],
    skipDuplicates: true,
  });

  const alert = await prisma.alert.findUniqueOrThrow({
    where: { dedupeKey },
    select: { id: true },
  });

  return { created: count === 1, alertId: alert.id };
}
