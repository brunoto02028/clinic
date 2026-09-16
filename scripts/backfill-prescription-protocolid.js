// Activity 46: a prescription created by assigning a protocol now remembers
// which protocol it came from, so the patient stops seeing it when that plan is
// archived or pulled back to draft. Rows created before this have no link —
// this gives them one.
//
// A prescription belongs to a protocol when: same patient, created in the
// window from the protocol's creation to 2 minutes after (assign writes both in
// one transaction), the protocol came from a template, and one of its items
// links the same exercise. Ties go to the closest protocol in time.
// Idempotent: only touches rows still without a protocol.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WINDOW_MS = 2 * 60 * 1000;
// Rows that are legitimately standalone never get a protocol, so "still null"
// keeps growing — a marker makes this run once instead of scanning them on
// every boot. Assignment fills the link in from here on.
const MARKER_KEY = 'prescription-protocolid-backfill-done';

async function main() {
  const marker = await prisma.systemConfig.findUnique({ where: { key: MARKER_KEY } });
  if (marker) {
    console.log('[backfill-prescription-protocolid] Already ran — skipping.');
    return;
  }

  const orphans = await prisma.exercisePrescription.findMany({
    where: { protocolId: null },
    select: { id: true, patientId: true, exerciseId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (orphans.length === 0) {
    console.log('[backfill-prescription-protocolid] No prescriptions without a protocol — nothing to do.');
    await markDone(0, 0);
    return;
  }

  const byPatient = new Map();
  for (const rx of orphans) {
    if (!byPatient.has(rx.patientId)) byPatient.set(rx.patientId, []);
    byPatient.get(rx.patientId).push(rx);
  }

  let linked = 0;
  let standalone = 0;
  for (const [patientId, rows] of byPatient) {
    const protocols = await prisma.treatmentProtocol.findMany({
      where: { patientId, templateId: { not: null } },
      select: {
        id: true,
        createdAt: true,
        items: { where: { exerciseId: { not: null } }, select: { exerciseId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (protocols.length === 0) {
      standalone += rows.length;
      continue;
    }
    for (const rx of rows) {
      const match = protocols
        .filter((p) => {
          const delta = rx.createdAt.getTime() - p.createdAt.getTime();
          return delta >= 0 && delta <= WINDOW_MS && p.items.some((it) => it.exerciseId === rx.exerciseId);
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      if (!match) {
        standalone++;
        continue;
      }
      // Guarded by protocolId: null so a concurrent boot can't overwrite a value.
      const res = await prisma.exercisePrescription.updateMany({
        where: { id: rx.id, protocolId: null },
        data: { protocolId: match.id },
      });
      if (res.count) console.log(`[backfill-prescription-protocolid] ${rx.id} -> ${match.id}`);
      linked += res.count;
    }
  }
  console.log(`[backfill-prescription-protocolid] Linked ${linked} prescription(s) to their protocol, left ${standalone} standalone.`);
  await markDone(linked, standalone);
}

async function markDone(linked, standalone) {
  await prisma.systemConfig.upsert({
    where: { key: MARKER_KEY },
    update: {},
    create: {
      key: MARKER_KEY,
      value: 'true',
      label: 'Prescription protocolId backfill done',
      description: `One-time marker (activity 46) — linked ${linked} prescription(s), left ${standalone} standalone.`,
      category: 'migration',
    },
  });
}

main()
  .catch((err) => {
    console.error('[backfill-prescription-protocolid] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
