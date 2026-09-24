// Fills `clinicId` on rows that were created without it.
//
// `ClinicMessage` and `MedicalScreening` both have the column and both were
// written with it null — from the patient's app and from the admin. Nothing
// read it, which is why nobody noticed; but `lib/command-context.ts` counts
// screenings by `clinicId`, so that counter has been reporting zero for every
// screening a patient filled in. Found by the admin↔app parity audit,
// 24/09/2026.
//
// The tenant comes from the patient's own `clinicId` — the only correct
// source, and the one the screens already use implicitly by reading through
// the patient.
//
// Idempotent and narrow: it only ever fills NULLs, never changes a row that
// already has a clinic. Safe to run on every boot.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.$executeRawUnsafe(`
    UPDATE "clinic_messages" m
       SET "clinicId" = u."clinicId"
      FROM "User" u
     WHERE m."patientId" = u.id
       AND m."clinicId" IS NULL
       AND u."clinicId" IS NOT NULL`);

  const screenings = await prisma.$executeRawUnsafe(`
    UPDATE "MedicalScreening" s
       SET "clinicId" = u."clinicId"
      FROM "User" u
     WHERE s."userId" = u.id
       AND s."clinicId" IS NULL
       AND u."clinicId" IS NOT NULL`);

  if (messages || screenings) {
    console.log(`[backfill-clinicid] messages=${messages} screenings=${screenings}`);
  } else {
    console.log('[backfill-clinicid] nothing to fill');
  }
}

main()
  .catch((e) => {
    console.error('[backfill-clinicid] error', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
