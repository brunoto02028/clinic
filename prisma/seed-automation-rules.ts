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
      titlePt: "{missingItems} atividades nao feitas hoje",
    },
    channels: ["INTERNAL"],
    active: true,
  },
  {
    code: "BP_THRESHOLDS",
    name: "Blood pressure — when to alert the clinic and when it is a crisis",
    // Not a trigger that fires on its own: the blood-pressure route reads these
    // numbers when a reading arrives. It lives here so a clinic can change them
    // without a deploy, which is what they were before — two pairs written into
    // the route.
    trigger: "THRESHOLD",
    // ACC/AHA 2017 bands. The alert pair reaches the clinic; the crisis pair is
    // the only thing in the product that writes to a patient without a human
    // approving it, because its message is "go to A&E now".
    condition: {
      alertSystolic: 130,
      alertDiastolic: 80,
      crisisSystolic: 180,
      crisisDiastolic: 120,
    },
    // Só a `condition` é lida hoje: a rota de pressão pega os quatro números e
    // monta o alerta com texto próprio. `action`, `actionData` e `channels`
    // ficam aqui porque é a T-4 que liga o alerta ao motor (Alert + canais), e
    // então estes campos passam a valer. Até lá, editá-los em
    // /admin/automation não muda o e-mail que sai.
    action: "CREATE_ALERT",
    actionData: {
      priority: "HIGH",
      titleEn: "Blood pressure {systolic}/{diastolic} mmHg",
      titlePt: "Pressao arterial {systolic}/{diastolic} mmHg",
    },
    channels: ["INTERNAL"],
    active: true,
  },
  {
    code: "EXERCISE_BP_LIMITS",
    name: "Blood pressure — when a session must not start, and when to stop",
    // Deliberately not the same rule as BP_THRESHOLDS. Those numbers classify a
    // reading taken at home; these decide whether today's session happens at
    // all. ACSM criteria, as the commercial plan states them: above 200/110 the
    // session is blocked, above 250/115 the instruction is to stop at once.
    // Editing one must never move the other.
    trigger: "THRESHOLD",
    condition: {
      blockSystolic: 200,
      blockDiastolic: 110,
      stopSystolic: 250,
      stopDiastolic: 115,
    },
    // Like BP_THRESHOLDS, only the `condition` is read today: the block itself
    // is applied by lib/automation/exercise-bp.ts, and the alert text below is
    // what T-4 will wire into the engine.
    action: "CREATE_ALERT",
    actionData: {
      priority: "HIGH",
      titleEn: "Session blocked — blood pressure {systolic}/{diastolic} mmHg",
      titlePt: "Sessao bloqueada — pressao {systolic}/{diastolic} mmHg",
    },
    channels: ["INTERNAL"],
    active: true,
  },
];

async function main() {
  for (const rule of RULES) {
    // `createdAt asc`, a mesma ordem que `loadRules` usa para escolher entre
    // linhas duplicadas. Sem isso o seed podia atualizar uma linha global que
    // o motor nem lê, e a configuração "salva" não valeria nada.
    const existing = await prisma.automationRule.findFirst({
      where: { code: rule.code, clinicId: null },
      orderBy: { createdAt: "asc" },
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
