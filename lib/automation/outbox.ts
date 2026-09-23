import { OutboundStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { renderPatientEmail } from "@/lib/patient-email";
import { sendEmail } from "@/lib/email";
import { getZonedMinutesOfDay } from "@/lib/clinic-timezone";
import { logAudit } from "@/lib/system-logger";

/**
 * The queue every automated message waits in (activity 072, T-4).
 *
 * The engine writes here and stops. Approving is the only path to delivery,
 * which is what makes the rest of the engine safe to build: a rule can be as
 * eager as it likes, and nothing reaches a patient that a person did not read
 * first.
 *
 * Delivery reuses what activity 68 already built for staff-written e-mail —
 * `renderPatientEmail` (BPR layout, both languages, content hash), `sendEmail`,
 * and the `PatientOutboundEmail` log. One home for "what was sent".
 */

/** 21:00–08:00 in the clinic's timezone, unless a rule says otherwise. */
export const DEFAULT_QUIET_START = "21:00";
export const DEFAULT_QUIET_END = "08:00";
/** Spec §3.5: at most three automated messages a day per patient. */
export const DEFAULT_DAILY_CAP = 3;

export interface EnqueueInput {
  clinicId: string;
  patientId: string;
  ruleCode: string;
  /** The rule's window — one message per rule per window, like alerts. */
  window: string;
  channel?: string;
  subjectEn: string;
  subjectPt: string;
  bodyEn: string;
  bodyPt: string;
  /** AuditLog action to write on delivery — see OutboundMessage.auditAction. */
  auditAction?: string | null;
  /** Builder for this message's layout, when the generic one is wrong. */
  templateCode?: string | null;
  templateVars?: Record<string, unknown> | null;
}

export function outboxIdempotencyKey(
  clinicId: string,
  ruleCode: string,
  patientId: string,
  window: string
): string {
  return `${clinicId}:${ruleCode}:${patientId}:${window}`;
}

/**
 * Queues a message. **Never sends.**
 *
 * Same shape as `createAlert`: the clinic leads the key, the database settles
 * the race, and a repeat inside the window is a no-op rather than a second
 * message in someone's inbox.
 */
export async function enqueueMessage(
  input: EnqueueInput
): Promise<{ queued: boolean; messageId: string }> {
  const idempotencyKey = outboxIdempotencyKey(
    input.clinicId,
    input.ruleCode,
    input.patientId,
    input.window
  );

  const { count } = await prisma.outboundMessage.createMany({
    data: [
      {
        clinicId: input.clinicId,
        patientId: input.patientId,
        ruleCode: input.ruleCode,
        channel: input.channel ?? "EMAIL",
        subjectEn: input.subjectEn,
        subjectPt: input.subjectPt,
        bodyEn: input.bodyEn,
        bodyPt: input.bodyPt,
        auditAction: input.auditAction ?? null,
        templateCode: input.templateCode ?? null,
        templateVars: (input.templateVars ?? undefined) as never,
        idempotencyKey,
      },
    ],
    skipDuplicates: true,
  });

  const row = await prisma.outboundMessage.findUniqueOrThrow({
    where: { idempotencyKey },
    select: { id: true },
  });
  return { queued: count === 1, messageId: row.id };
}

export type HoldReason =
  | "NO_CONSENT"
  | "QUIET_HOURS"
  | "DAILY_CAP"
  | "NO_EMAIL"
  | "CHANNEL_NOT_SUPPORTED";

/** "21:00" → 1260. */
function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Quiet hours in the clinic's own timezone, wrapping past midnight.
 * 21:00–08:00 means 21:00 *or later*, or *before* 08:00.
 */
export function inQuietHours(
  now: Date,
  timezone: string,
  start = DEFAULT_QUIET_START,
  end = DEFAULT_QUIET_END
): boolean {
  const minute = getZonedMinutesOfDay(now, timezone);
  const from = minutesOf(start);
  const to = minutesOf(end);
  return from > to ? minute >= from || minute < to : minute >= from && minute < to;
}

/**
 * Why this message must not go out right now, or `null` when it may.
 *
 * Everything here **holds**; nothing discards. A message the clinic approved
 * and the patient never received, with no trace of why, is the failure this
 * whole queue exists to avoid.
 */
export async function holdReasonFor(
  messageId: string,
  now = new Date()
): Promise<HoldReason | null> {
  const msg = await prisma.outboundMessage.findUniqueOrThrow({
    where: { id: messageId },
    select: {
      patientId: true,
      clinicId: true,
      patient: { select: { email: true, consentAcceptedAt: true, communicationPreference: true } },
      clinic: { select: { timezone: true } },
    },
  });

  if (!msg.patient.email) return "NO_EMAIL";
  // This queue delivers by e-mail. A patient who asked for WhatsApp is held
  // with a reason rather than quietly downgraded to a channel they did not
  // choose — the direct send honoured their preference, and losing that
  // silently would be worse than not sending. WhatsApp needs Meta-approved
  // templates first (spec §11).
  const pref = msg.patient.communicationPreference;
  if (pref && pref !== "EMAIL") return "CHANNEL_NOT_SUPPORTED";
  // The patient's acceptance of the clinic's terms. Per-channel consent
  // (push, WhatsApp) arrives with WhatsApp — spec §11, plan assumption 4.
  if (!msg.patient.consentAcceptedAt) return "NO_CONSENT";

  if (inQuietHours(now, msg.clinic.timezone || "Europe/London")) return "QUIET_HOURS";

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const sentToday = await prisma.outboundMessage.count({
    where: { patientId: msg.patientId, status: OutboundStatus.SENT, sentAt: { gte: dayStart } },
  });
  if (sentToday >= DEFAULT_DAILY_CAP) return "DAILY_CAP";

  return null;
}

/**
 * What this message actually looks like.
 *
 * One function for the preview and for the send, so they cannot drift: the
 * whole point of the hash guard is that the approver saw what goes out.
 *
 * A `templateCode` picks a purpose-built layout. The daily reminder has one —
 * a greeting by name and a button into the app — and moving that message into
 * this queue must not quietly cost the patient either of them.
 */
export async function renderQueuedMessage(msg: {
  subjectEn: string;
  subjectPt: string;
  bodyEn: string;
  bodyPt: string;
  templateCode: string | null;
  templateVars: unknown;
  patientId: string;
  clinicId: string;
  patient: { preferredLocale: string | null; clinicId: string | null };
}): Promise<{ subject: string; html: string; bodyText: string; locale: string; bothLanguages: boolean; hash: string }> {
  const generic = await renderPatientEmail(msg.patient, {
    subjectEn: msg.subjectEn,
    subjectPt: msg.subjectPt,
    bodyEn: msg.bodyEn,
    bodyPt: msg.bodyPt,
    language: "both",
  });

  if (msg.templateCode !== "TODAY_REMINDER") return generic;

  const vars = (msg.templateVars ?? {}) as { firstName?: string; titles?: string[]; custom?: string };
  const { buildPatientReminderEmail } = await import("@/lib/daily-adherence-email");
  const html = await buildPatientReminderEmail(
    vars.firstName ?? "",
    vars.titles ?? [],
    msg.patient.preferredLocale || "en-GB",
    msg.clinicId,
    vars.custom ?? null
  );

  // The hash still covers the text, as activity 68 defined it; the layout is
  // decided by the same stored fields, so it cannot change between the two
  // calls either.
  return { ...generic, html: typeof html === "string" ? html : generic.html };
}

/**
 * Sends one approved message, or records why it is still waiting.
 *
 * Only ever called for a message a person approved. It re-renders rather than
 * trusting stored HTML, and refuses when the render no longer matches what the
 * approver saw — activity 68's guard, for the same reason: approval is of a
 * specific text, not of a row id.
 */
export async function deliverMessage(
  messageId: string,
  now = new Date()
): Promise<{ sent: boolean; held?: HoldReason; error?: string }> {
  const msg = await prisma.outboundMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: {
      patient: { select: { email: true, preferredLocale: true, clinicId: true } },
    },
  });

  if (msg.status !== OutboundStatus.APPROVED) {
    return { sent: false, error: `Message is ${msg.status}` };
  }

  const hold = await holdReasonFor(messageId, now);
  if (hold) {
    await prisma.outboundMessage.update({ where: { id: messageId }, data: { holdReason: hold } });
    return { sent: false, held: hold };
  }

  const rendered = await renderQueuedMessage(msg);

  if (msg.approvedHash && msg.approvedHash !== rendered.hash) {
    const error = "The message changed since it was approved";
    await prisma.outboundMessage.update({
      where: { id: messageId },
      data: { status: OutboundStatus.FAILED, providerError: error },
    });
    return { sent: false, error };
  }

  const result = await sendEmail({
    to: msg.patient.email!,
    subject: rendered.subject,
    html: rendered.html,
  });
  const ok = result.success === true;

  await prisma.$transaction([
    prisma.outboundMessage.update({
      where: { id: messageId },
      data: {
        status: ok ? OutboundStatus.SENT : OutboundStatus.FAILED,
        sentAt: ok ? now : null,
        holdReason: null,
        providerError: ok ? null : String((result as { error?: unknown }).error ?? "send failed"),
      },
    }),
    // The same log staff-written e-mail writes to, so "what this patient was
    // sent" stays one list rather than two.
    prisma.patientOutboundEmail.create({
      data: {
        clinicId: msg.clinicId,
        patientId: msg.patientId,
        sentById: msg.approvedById,
        locale: rendered.locale,
        bothLanguages: rendered.bothLanguages,
        subject: rendered.subject,
        bodyText: rendered.bodyText,
        html: rendered.html,
        contentHash: rendered.hash,
        status: ok ? "sent" : "failed",
        providerError: ok ? null : String((result as { error?: unknown }).error ?? "send failed"),
      },
    }),
  ]);

  // "Queued" is not "sent". The screens that ask whether today's reminder went
  // out read this, and they only become true here.
  if (ok && msg.auditAction) {
    await logAudit({
      userId: msg.patientId,
      userEmail: "",
      userRole: "PATIENT",
      action: msg.auditAction,
      entity: "User",
      entityId: msg.patientId,
      description: `${msg.ruleCode} delivered after approval`,
    });
  }

  return ok ? { sent: true } : { sent: false, error: "send failed" };
}

/**
 * Delivers everything a human approved that was held — quiet hours ended, the
 * day rolled over. Nothing here was decided by a machine; it only finishes
 * what someone already said yes to.
 */
export async function deliverApprovedMessages(now = new Date()): Promise<number> {
  const due = await prisma.outboundMessage.findMany({
    where: { status: OutboundStatus.APPROVED },
    select: { id: true },
    take: 50,
  });

  let sent = 0;
  for (const { id } of due) {
    const result = await deliverMessage(id, now).catch(() => ({ sent: false }));
    if (result.sent) sent++;
  }
  return sent;
}
