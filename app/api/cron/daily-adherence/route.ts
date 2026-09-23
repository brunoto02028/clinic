import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence, getClinicPatientsFallingBehind } from "@/lib/clinic-daily-adherence";
import { getFallingBehindThreshold, FALLING_BEHIND_RULE } from "@/lib/automation/adherence-threshold";
import { REMINDER_ACTION, buildTodayReminderText } from "@/lib/daily-adherence-email";
import { getReminderTemplates } from "@/lib/reminder-templates";
import { enqueueMessage } from "@/lib/automation/outbox";
import { loadRules, evaluateCondition, actionText, interpolate } from "@/lib/automation/rules";
import { createAlert } from "@/lib/alerts";
import { runOnce } from "@/lib/automation/run";
import { AlertPriority } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/cron/daily-adherence — reminds every patient still missing
// today's activities (see specs/049-relatorio-adesao-diaria). The clinic
// summary e-mail used to live here too; split out to /api/cron/daily-report
// on 17/09/2026 so that one can stay on an automatic schedule while this
// one — the one that actually messages a patient — is only ever triggered
// manually via the per-patient "Send now" button, never by a cron.
// Call via cron/manual: curl -X POST https://bpr.clinic/api/cron/daily-adherence?key=SECRET
//
// Activity 072 T-3: the thresholds now come from AutomationRule rows rather
// than from constants here, so a clinic can change them without a deploy. Seed
// them with prisma/seed-automation-rules.ts. The wording stays with the
// reminder templates of activity 62 — one home each, no copies.
//
// The response lists every clinic with activity today, not only those that
// were messaged: a clinic with reminders off now appears with
// remindersSent: 0 and whatever alerts were raised.
const REMINDER_RULE = "ADHERENCE_DAILY_REMINDER";
const ALERT_RULE = FALLING_BEHIND_RULE;

export async function POST(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  if (key !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // "Today" is computed in the server's own timezone — close enough to the
  // clinic's (Europe/London) for a job meant to fire well away from
  // midnight, but not exact across a DST-shifted boundary. Flagged in the
  // plan (decision 7) as something to tighten once this is running for real.
  const now = new Date();

  // Every active clinic, not only the ones that opted into reminders: the
  // alert rule raises nothing outward, and a clinic with reminders off is
  // exactly the one whose therapist has no other way of noticing. Messaging
  // stays gated by dailyRemindersEnabled (act.61) below, so what leaves the
  // building is unchanged.
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true },
    select: { id: true, name: true, dailyRemindersEnabled: true },
  });

  const results: {
    clinicId: string;
    completed: number;
    missing: number;
    remindersQueued: number;
    alertsRaised: number;
  }[] = [];

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  // Built from the local parts, not `toISOString()`: midnight local in BST is
  // 23:00Z the day before, so slicing the ISO string labelled every alert with
  // yesterday's date for seven months of the year.
  const day = [
    dayStart.getFullYear(),
    String(dayStart.getMonth() + 1).padStart(2, "0"),
    String(dayStart.getDate()).padStart(2, "0"),
  ].join("-");

  const failures: { clinicId: string; error: string }[] = [];

  for (const clinic of clinics) {
    try {
    const { completed, missing } = await getClinicDailyAdherence(clinic.id, now);
    if (completed.length === 0 && missing.length === 0) continue; // nothing scheduled anywhere today

    const rules = await loadRules([REMINDER_RULE, ALERT_RULE], clinic.id);
    const reminderRule = rules.get(REMINDER_RULE);
    const alertRule = rules.get(ALERT_RULE);

    // Two switches, both of which must be on. dailyRemindersEnabled is the
    // clinic owner's own toggle (act.61) and stays the one they see; the rule's
    // `active` is the engine's. Unifying them is T-6's job — until then, a rule
    // cannot start messaging a clinic that never opted in.
    const reminderOn =
      clinic.dailyRemindersEnabled && !!reminderRule?.active && reminderRule.action === "SEND_MESSAGE";
    const alertOn = !!alertRule?.active && alertRule.action === "CREATE_ALERT";

    let remindersQueued = 0;
    let alertsRaised = 0;

    // "Who has gone quiet?" — the signal activity 071 built, which is the
    // right question: days since the patient last did anything, counted only
    // while something was actually liberated for them. The old condition here
    // asked "how many items did they miss today?", which is a single day's
    // snapshot and flags someone who did four exercises out of five.
    if (alertOn) {
      const thresholdDays = await getFallingBehindThreshold(clinic.id);
      const behind = await getClinicPatientsFallingBehind(clinic.id, now, thresholdDays);

      for (const p of behind) {
        const facts = { daysWithoutActivity: p.daysWithoutActivity };
        if (!evaluateCondition(alertRule!.condition, facts)) continue;

        const run = await runOnce(
          { clinicId: clinic.id, ruleCode: ALERT_RULE, patientId: p.patientId, window: day, facts },
          async () => {
            const { created, escalated } = await createAlert({
              clinicId: clinic.id,
              patientId: p.patientId,
              ruleCode: ALERT_RULE,
              window: day,
              title: interpolate(actionText(alertRule!, "titleEn") ?? "No activity for {daysWithoutActivity} days", facts),
              titlePt: actionText(alertRule!, "titlePt")
                ? interpolate(actionText(alertRule!, "titlePt")!, facts)
                : null,
              priority: (actionText(alertRule!, "priority") as AlertPriority | null) ?? AlertPriority.LOW,
              details: { daysWithoutActivity: p.daysWithoutActivity, thresholdDays },
            });
            return {
              result: created ? "ALERT_RAISED" : escalated ? "ALERT_ESCALATED" : "ALERT_DEDUPED",
              details: { daysWithoutActivity: p.daysWithoutActivity, thresholdDays },
            };
          }
        );
        if (run.ran && run.result === "ALERT_RAISED") alertsRaised++;
      }
    }
    // Loaded once per clinic rather than per patient.
    const templates = reminderOn ? await getReminderTemplates(clinic.id) : null;

    for (const patient of missing) {
      const facts = { missingItems: patient.missingItems.length };

      if (!reminderOn || !evaluateCondition(reminderRule!.condition, facts)) continue;

      // The rule decides *whether* and *for whom*; the clinic's own reminder
      // templates (activity 62, editable at /admin/reminder-templates) decide
      // *what it says* — the same builders the direct send used, so the patient
      // reads exactly the text they read today.
      const text = buildTodayReminderText(
        patient.missingItems.map((i) => i.title),
        templates?.today
      );

      // The queue's key stops it queueing twice, but it knows nothing about
      // the "Send now" button, which still sends directly. Without this check
      // a patient who already had today's reminder by hand gets a second one
      // sitting in the queue, and nothing on the card tells the approver.
      const alreadySent = await prisma.auditLog.findFirst({
        where: { userId: patient.patientId, action: REMINDER_ACTION, createdAt: { gte: dayStart } },
        select: { id: true },
      });
      if (alreadySent) continue;

      // And here is the change this task exists for: it queues. Nothing goes
      // to the patient until somebody reads it and clicks. The audit line is
      // written on delivery, because queued is not sent.
      const { queued } = await enqueueMessage({
        clinicId: clinic.id,
        patientId: patient.patientId,
        ruleCode: REMINDER_RULE,
        window: day,
        subjectEn: "Your plan today",
        subjectPt: "Seu plano de hoje",
        bodyEn: text.en,
        bodyPt: text.pt,
        auditAction: REMINDER_ACTION,
        // Same layout the direct send used — the greeting and the button into
        // the app survive the move into the queue.
        templateCode: "TODAY_REMINDER",
        templateVars: {
          firstName: patient.name?.split(" ")[0] ?? "",
          titles: patient.missingItems.map((i) => i.title),
          custom: templates?.today ?? null,
        },
      });
      if (queued) remindersQueued++;
    }

    results.push({
      clinicId: clinic.id,
      completed: completed.length,
      missing: missing.length,
      remindersQueued,
      alertsRaised,
    });
    } catch (error) {
      // One clinic's bad rule must not stop the engine for every other clinic.
      // QA took the whole run down with a single mistyped priority, and which
      // clinics got skipped depended on the order rows came back in.
      // Prisma's message carries the whole failing payload — patient ids and
      // the titles of their exercises — and this goes to the response and to
      // the production log. The first line names what broke; the rest stays in
      // the stack, which the server keeps and the response does not.
      const full = error instanceof Error ? error.message : String(error);
      const summary = full.split(/\r?\n/).find((l) => l.trim().length > 0)?.trim().slice(0, 160) ?? "unknown error";
      console.error(`[daily-adherence] clinic ${clinic.id} failed: ${summary}`, error);
      failures.push({ clinicId: clinic.id, error: summary });
    }
  }

  return NextResponse.json({ results, ...(failures.length ? { failures } : {}) });
}
