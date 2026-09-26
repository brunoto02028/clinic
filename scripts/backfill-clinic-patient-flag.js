// Marks as clinic patients everyone the clinic has actually treated (083).
//
// `isClinicPatient` was born false, which is right for a new sign-up and wrong
// for every patient who already existed: they would open the app and find the
// clinic area gone. This fills the flag once, from what the clinic has already
// done for the person — an appointment, a package, a submitted screening, a
// prescribed exercise, a clinical note, an active subscription.
//
// Buying a laboratory test is deliberately NOT on that list: it is exactly the
// act that does not make someone a patient.
//
// Idempotent: it only ever sets false → true, and a person who is already true
// is skipped. Safe to run on every boot.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const candidatos = await prisma.user.findMany({
    where: {
      role: 'PATIENT',
      isClinicPatient: false,
      OR: [
        { patientAppointments: { some: {} } },
        { packagesAsPatient: { some: {} } },
        { medicalScreening: { is: { isSubmitted: true } } },
        { receivedExercises: { some: {} } },
        { soapNotesFor: { some: {} } },
      ],
    },
    select: { id: true },
  });

  if (candidatos.length === 0) {
    console.log('[backfill-clinic-patient] nothing to do.');
    return;
  }

  const r = await prisma.user.updateMany({
    where: { id: { in: candidatos.map((c) => c.id) } },
    data: { isClinicPatient: true },
  });
  console.log(`[backfill-clinic-patient] ${r.count} patient(s) marked from existing clinical history.`);
}

main()
  .catch((err) => { console.error('[backfill-clinic-patient] error', err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
