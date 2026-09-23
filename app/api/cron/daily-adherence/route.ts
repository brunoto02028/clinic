import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicDailyAdherence } from "@/lib/clinic-daily-adherence";
import { REMINDER_MESSAGE_EN, REMINDER_MESSAGE_PT, REMINDER_ACTION } from "@/lib/daily-adherence-email";
import { notifyPatient } from "@/lib/notify-patient";
import { logAudit } from "@/lib/system-logger";
import { loadRules, evaluateCondition, actionText, interpolate } from "@/lib/automation/rules";
import { createAlert } from "@/lib/alerts";
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
const ALERT_RULE = "ADHERENCE_DAILY_ALERT";

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
    remindersSent: number;
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

  for (const clinic of clinics) {
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

    let remindersSent = 0;
    let alertsRaised = 0;

    for (const patient of missing) {
      const facts = { missingItems: patient.missingItems.length };

      if (alertOn && evaluateCondition(alertRule!.condition, facts)) {
        const { created } = await createAlert({
          clinicId: clinic.id,
          patientId: patient.patientId,
          ruleCode: ALERT_RULE,
          window: day,
          title: interpolate(
            actionText(alertRule!, "titleEn") ?? "Activities missed today",
            facts
          ),
          priority:
            (actionText(alertRule!, "priority") as AlertPriority | null) ?? AlertPriority.LOW,
          details: {
            missingItems: facts.missingItems,
            titles: patient.missingItems.map((i) => i.title),
          },
        });
        if (created) alertsRaised++;
      }

      if (!reminderOn || !evaluateCondition(reminderRule!.condition, facts)) continue;

      const already = await prisma.auditLog.findFirst({
        where: { userId: patient.patientId, action: REMINDER_ACTION, createdAt: { gte: dayStart } },
        select: { id: true },
      });
      if (already) continue;

      // The wording is not the rule's to give: `useReminderTemplate` makes
      // notifyPatient build the message from the clinic's own reminder
      // templates (activity 62, editable at /admin/reminder-templates), and it
      // ignores anything passed as plainMessage. The rule owns *whether* and
      // *for whom*; the templates own *what it says*.
      await notifyPatient({
        patientId: patient.patientId,
        plainMessage: REMINDER_MESSAGE_EN,
        plainMessagePt: REMINDER_MESSAGE_PT,
        useReminderTemplate: true,
        todayMissingTitles: patient.missingItems.map((i) => i.title),
      });
      await logAudit({
        userId: patient.patientId,
        userEmail: "",
        userRole: "PATIENT",
        action: REMINDER_ACTION,
        entity: "User",
        entityId: patient.patientId,
        description: `Daily adherence reminder sent to ${patient.name}`,
      });
      remindersSent++;
    }

    results.push({
      clinicId: clinic.id,
      completed: completed.length,
      missing: missing.length,
      remindersSent,
      alertsRaised,
    });
  }

  return NextResponse.json({ results });
}
