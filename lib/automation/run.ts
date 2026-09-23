import { createHash } from "crypto";
import { Prisma, RunStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Facts } from "./rules";

/**
 * One record per rule evaluation (activity 072, T-5).
 *
 * Two jobs in one row. It stops the same evaluation happening twice — the
 * protection each job used to reinvent for itself, and that a new one would
 * forget — and it answers the question nobody could answer before: *why did
 * this patient get this?*
 */

export interface RunKeyParts {
  clinicId: string;
  ruleCode: string;
  patientId?: string | null;
  window: string;
  /** The figures the rule looked at. See `runKey` for why they are in the key. */
  facts?: Facts;
}

/**
 * `clinic:rule:patient:window:facts`.
 *
 * The facts are part of the key on purpose. Keying on the window alone would
 * make the first run of the day the only one — and an alert that should have
 * escalated, because adherence fell from 40% to 5% that afternoon, would be
 * read as a repeat and skipped. The same situation twice is one run; a
 * situation that changed is a different one.
 */
export function runKey(parts: RunKeyParts): string {
  const base = [parts.clinicId, parts.ruleCode, parts.patientId ?? "-", parts.window].join(":");
  if (!parts.facts || Object.keys(parts.facts).length === 0) return base;
  // Sorted, so key order in the caller cannot change the key.
  const stable = JSON.stringify(
    Object.fromEntries(Object.entries(parts.facts).sort(([a], [b]) => a.localeCompare(b)))
  );
  return `${base}:${createHash("sha256").update(stable).digest("hex").slice(0, 16)}`;
}

export interface RunOutcome {
  /** One word for what it did: ALERT_RAISED, MESSAGE_QUEUED, NOTHING… */
  result: string;
  details?: Prisma.InputJsonValue;
}

/**
 * Runs `fn` once for this key, ever.
 *
 * The claim is an insert, not a read-then-write: two workers evaluating the
 * same rule at the same moment both pass a "has this run?" check, and both
 * act. Here the database decides who owns the run, and the loser does nothing.
 *
 * A run that **failed** may be claimed again — a transient error must not
 * silence a rule until someone notices. A run still `RUNNING` is left alone.
 */
export async function runOnce(
  parts: RunKeyParts,
  fn: () => Promise<RunOutcome>
): Promise<{ ran: boolean; result?: string; reason?: "already-done" | "in-progress" }> {
  const idempotencyKey = runKey(parts);

  const { count } = await prisma.automationRun.createMany({
    data: [
      {
        clinicId: parts.clinicId,
        patientId: parts.patientId ?? null,
        ruleCode: parts.ruleCode,
        window: parts.window,
        idempotencyKey,
        status: RunStatus.RUNNING,
        details: (parts.facts as Prisma.InputJsonValue) ?? undefined,
      },
    ],
    skipDuplicates: true,
  });

  let owned = count === 1;

  if (!owned) {
    const existing = await prisma.automationRun.findUniqueOrThrow({
      where: { idempotencyKey },
      select: { status: true, result: true },
    });
    if (existing.status === RunStatus.DONE) {
      return { ran: false, result: existing.result ?? undefined, reason: "already-done" };
    }
    if (existing.status === RunStatus.RUNNING) {
      return { ran: false, reason: "in-progress" };
    }
    // FAILED: claim it back, in one statement so only one retrier wins.
    const claimed = await prisma.automationRun.updateMany({
      where: { idempotencyKey, status: RunStatus.FAILED },
      data: { status: RunStatus.RUNNING, attempts: { increment: 1 }, error: null },
    });
    if (claimed.count !== 1) return { ran: false, reason: "in-progress" };
    owned = true;
  }

  try {
    const outcome = await fn();
    await prisma.automationRun.update({
      where: { idempotencyKey },
      data: {
        status: RunStatus.DONE,
        result: outcome.result,
        details: outcome.details ?? undefined,
      },
    });
    return { ran: true, result: outcome.result };
  } catch (error) {
    await prisma.automationRun.update({
      where: { idempotencyKey },
      data: { status: RunStatus.FAILED, error: String((error as Error)?.message ?? error) },
    });
    throw error;
  }
}

/** What ran for this patient, newest first — the history the record shows. */
export async function runsForPatient(patientId: string, clinicId: string, take = 50) {
  return prisma.automationRun.findMany({
    where: { patientId, clinicId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      ruleCode: true,
      window: true,
      status: true,
      result: true,
      details: true,
      error: true,
      attempts: true,
      createdAt: true,
    },
  });
}
