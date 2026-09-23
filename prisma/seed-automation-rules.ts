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

const prisma = new PrismaClient();

const RULES = [
  {
    code: "ADHERENCE_DAILY_REMINDER",
    name: "Daily reminder — activities still open today",
    trigger: "SCHEDULE",
    // What the route already did: remind anyone with anything left today.
    condition: { missingItems: { gte: 1 } },
    action: "SEND_MESSAGE",
    // No wording here. The reminder's text already has a home the clinic can
    // edit — the templates of activity 62, at /admin/reminder-templates — and
    // notifyPatient builds the message from those. Seeding a copy into the
    // rule made a field that looked editable and changed nothing.
    actionData: { useReminderTemplate: true },
    channels: ["EMAIL"],
    active: true,
  },
  {
    code: "ADHERENCE_DAILY_ALERT",
    name: "Alert the therapist — three or more activities missed today",
    trigger: "SCHEDULE",
    // Higher than the reminder's threshold on purpose. One missed exercise is
    // a nudge for the patient; three is worth a therapist's attention.
    condition: { missingItems: { gte: 3 } },
    action: "CREATE_ALERT",
    actionData: {
      priority: "LOW",
      // `{missingItems}` is filled from the facts, so raising or lowering the
      // threshold cannot leave the title claiming a number that is not true.
      // English only: an alert is internal, and English is this product's
      // canonical language.
      titleEn: "{missingItems} activities missed today",
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
