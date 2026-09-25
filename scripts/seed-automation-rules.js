// Seeds the platform's global automation rules on boot.
//
// The rules themselves are activity 072 (adherence) and 074 (blood pressure).
// They were seeded by running `prisma/seed-automation-rules.ts` by hand
// against a database, which worked for local development and silently did not
// happen in production: `/admin/automation` listed nothing there, so the whole
// point of putting the thresholds in a rule — "the clinic changes the number
// without a deploy" — was not true in the only place it mattered.
//
// The behaviour was never wrong: with no rule, `getBpThresholds` and
// `getExerciseBpLimits` fall back to the same numbers this file seeds. What
// was missing is the row the admin screen edits.
//
// Idempotent: the **global** row (clinicId = null) is created if absent and
// updated to these values if present. A clinic's own override row is never
// touched — that is the clinic's setting, not ours.
//
// Kept in sync by hand with prisma/seed-automation-rules.ts, which is the
// developer-facing copy. The duplication is deliberate: the image has no tsx,
// and every other boot seed here is plain JavaScript for the same reason.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RULES = [
  {
    code: 'ADHERENCE_DAILY_REMINDER',
    name: 'Daily reminder when the patient has not done their activities',
    trigger: 'DAILY_ADHERENCE',
    condition: { missingItems: { gte: 1 } },
    action: 'SEND_MESSAGE',
    actionData: { useReminderTemplate: true },
    channels: ['EMAIL'],
    active: true,
  },
  {
    code: 'ADHERENCE_DAILY_ALERT',
    name: 'Alert the clinic when a patient misses activities',
    trigger: 'DAILY_ADHERENCE',
    condition: { missingItems: { gte: 3 } },
    action: 'CREATE_ALERT',
    actionData: {
      priority: 'MEDIUM',
      titleEn: '{missingItems} activities missed today',
      titlePt: '{missingItems} atividades não feitas hoje',
    },
    channels: ['INTERNAL'],
    active: true,
  },
  {
    code: 'BP_THRESHOLDS',
    name: 'Blood pressure — when to alert the clinic and when it is a crisis',
    trigger: 'THRESHOLD',
    condition: {
      alertSystolic: 130,
      alertDiastolic: 80,
      crisisSystolic: 180,
      crisisDiastolic: 120,
    },
    action: 'CREATE_ALERT',
    actionData: {
      priority: 'HIGH',
      titleEn: 'Blood pressure {systolic}/{diastolic} mmHg',
      titlePt: 'Pressão arterial {systolic}/{diastolic} mmHg',
    },
    channels: ['INTERNAL'],
    active: true,
  },
  {
    code: 'EXERCISE_BP_LIMITS',
    name: 'Blood pressure — when a session must not start, and when to stop',
    trigger: 'THRESHOLD',
    condition: {
      blockSystolic: 200,
      blockDiastolic: 110,
      stopSystolic: 250,
      stopDiastolic: 115,
    },
    action: 'CREATE_ALERT',
    actionData: {
      priority: 'HIGH',
      titleEn: 'Session blocked — blood pressure {systolic}/{diastolic} mmHg',
      titlePt: 'Sessão bloqueada — pressão {systolic}/{diastolic} mmHg',
    },
    channels: ['INTERNAL'],
    active: true,
  },
  {
    code: 'WEARABLE_SILENCE',
    name: 'Aparelho em silêncio',
    // `description` e `scope` nao existem em AutomationRule — copiei os dois da
    // copia .ts, onde sao contexto e nao colunas, e o seed estourou em
    // producao com `Unknown argument 'description'`. Os quatro updates
    // passaram e so o create novo falhou, entao o deploy ficou verde e a regra
    // simplesmente nao existiu no ar. O guard esta em
    // __tests__/automation/seed-rules-shape.test.ts.
    trigger: 'THRESHOLD',
    condition: { silentDays: 5 },
    active: true,
    channels: ['INTERNAL'],
    action: 'CREATE_ALERT',
    actionData: {
      priority: 'MEDIUM',
      titleEn: 'Device has sent nothing for {days} days',
      titlePt: 'Aparelho não envia nada há {days} dias',
    },
  },
];

async function main() {
  for (const rule of RULES) {
    // `createdAt asc`, the same order the engine uses to choose between
    // duplicated rows — so the seed fixes the row that is actually in force.
    const existing = await prisma.automationRule.findFirst({
      where: { code: rule.code, clinicId: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (existing) {
      await prisma.automationRule.update({ where: { id: existing.id }, data: rule });
      console.log(`[seed-automation-rules] updated ${rule.code}`);
    } else {
      await prisma.automationRule.create({ data: rule });
      console.log(`[seed-automation-rules] created ${rule.code}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('[seed-automation-rules] error', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
