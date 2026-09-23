/**
 * Seeds the global automation rules (activity 072, T-3).
 *
 * Run with: npx tsx prisma/seed-automation-rules.ts
 *
 * Idempotent, and deliberately so: Postgres treats NULLs as distinct in a
 * unique index, so `@@unique([code, clinicId])` does not stop a second global
 * row for the same code. This looks before it writes.
 *
 * The values are the ones the code already used, so seeding changes nothing —
 * it only moves the decision somewhere a clinic can reach it.
 */
import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { ADHERENCE_CONFIG } from "../lib/adherence-config";

const prisma = new PrismaClient();

const RULES = [
  {
    code: "ADHERENCE_DAILY_REMINDER",
    name: "Daily reminder — activities still open today",
    trigger: "SCHEDULE",
    // What the route already did: remind anyone with anything left today.
    condition: { missingItems: { gte: 1 } },
    action: "SEND_MESSAGE",
    // Empty on purpose. The reminder's text already has a home the clinic can
    // edit — the templates of activity 62, at /admin/reminder-templates — and
    // notifyPatient builds the message from those. A copy here would be a
    // field that looks like a lever and is wired to nothing, which is exactly
    // what QA caught in messageEn; `useReminderTemplate` was the last of them.
    // Empty on purpose. The wording lives with activity 62's reminder
    // templates, and the AuditLog action is the route's own constant, written
    // onto the queued row — nothing reads it from here. A field in the table
    // that no code reads is the shape QA caught three times in this activity.
    actionData: {},
    channels: ["EMAIL"],
    active: true,
  },
  {
    code: "ADHERENCE_FALLING_BEHIND",
    name: "Alert the therapist — the patient has gone quiet",
    trigger: "SCHEDULE",
    // Days since the patient last did anything, counted only while something
    // was actually liberated for them (activity 071's signal). The threshold
    // starts at the value that activity shipped, so unifying the two changes
    // nothing on day one.
    condition: { daysWithoutActivity: { gte: ADHERENCE_CONFIG.fallingBehindThresholdDays } },
    action: "CREATE_ALERT",
    actionData: {
      priority: "LOW",
      // `{daysWithoutActivity}` is filled from the facts, so the title cannot
      // claim a number the rule did not use.
      titleEn: "No activity for {daysWithoutActivity} days",
      titlePt: "Sem atividade ha {daysWithoutActivity} dias",
    },
    channels: ["INTERNAL"],
    active: true,
  },
];

async function main() {
  for (const rule of RULES) {
    const existing = await prisma.automationRule.findFirst({
      where: { code: rule.code, clinicId: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.automationRule.update({ where: { id: existing.id }, data: rule });
      console.log(`atualizada: ${rule.code}`);
    } else {
      await prisma.automationRule.create({ data: rule });
      console.log(`criada:     ${rule.code}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
