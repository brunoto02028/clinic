// One-off, idempotent (activity 34): personal-trainer tenants get the new BA
// One "health" moss brand colour now, not just newly-created ones. Only
// touches a colour field still at its OLD default (never customised) — each
// field is checked independently, so a trainer who customised only one of
// the two (e.g. picked their own secondaryColor but never touched
// primaryColor) still gets the untouched field migrated, instead of being
// skipped entirely because the pair as a whole didn't match.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OLD_PRIMARY = '#607d7d';
const OLD_SECONDARY = '#5dc9c0';
const NEW_PRIMARY = '#4F7361';
const NEW_SECONDARY = '#3D5A4D';

async function main() {
  const primaryResult = await prisma.clinic.updateMany({
    where: { type: 'PERSONAL_TRAINER', primaryColor: OLD_PRIMARY },
    data: { primaryColor: NEW_PRIMARY },
  });
  const secondaryResult = await prisma.clinic.updateMany({
    where: { type: 'PERSONAL_TRAINER', secondaryColor: OLD_SECONDARY },
    data: { secondaryColor: NEW_SECONDARY },
  });
  console.log(`[migrate-personal-trainer-colors] Updated primaryColor on ${primaryResult.count} and secondaryColor on ${secondaryResult.count} personal-trainer clinic(s) still on the old default.`);
}

main()
  .catch((err) => console.error('[migrate-personal-trainer-colors] Error:', err.message))
  .finally(() => prisma.$disconnect());
