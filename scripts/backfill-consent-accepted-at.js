// Carries an acceptance that already happened into the column that is read.
//
// The assessment's last step has a consent tick, and the app says in as many
// words that this is where the terms are accepted. It wrote
// `MedicalScreening.consentGiven`; the portal gates on
// `User.consentAcceptedAt`. Two columns for one promise — harmless while
// nothing enforced it, and a locked door the moment the server did
// (parity audit, 24/09/2026).
//
// The screening is locked after submission, so these patients cannot re-tick
// anything: without this they would be refused forever for something they
// already did. The date comes from the screening's own `updatedAt` — the
// moment they ticked it — not from today, because that is when consent was
// actually given.
//
// Idempotent and narrow: only NULLs, only a submitted screening with the tick.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const filled = await prisma.$executeRawUnsafe(`
    UPDATE "User" u
       SET "consentAcceptedAt" = s."updatedAt"
      FROM "MedicalScreening" s
     WHERE s."userId" = u.id
       AND u."consentAcceptedAt" IS NULL
       AND s."consentGiven" = true
       AND s."isSubmitted" = true
       AND s."filledBy" = 'PATIENT'`);

  console.log(filled
    ? `[backfill-consent] filled=${filled}`
    : '[backfill-consent] nothing to fill');
}

main()
  .catch((e) => {
    console.error('[backfill-consent] error', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
