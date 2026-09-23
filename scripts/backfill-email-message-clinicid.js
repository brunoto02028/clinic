// Activity 71: app/api/admin/email/route.ts never scoped any of its reads or
// writes by clinicId — any signed-in staff member (any clinic) could list,
// approve/send, discard, or delete another clinic's financial emails
// (invoices) and other mail. Fixing that route to filter by the acting
// staff's clinicId would silently hide every pre-existing row that was
// created without one (found in production: every row created by the
// "send"/"sync" actions, since neither ever set clinicId) — Bruno would open
// the inbox and see history missing, which is worse than the leak. This
// backfill runs first so the route fix never has anything left to hide.
//
// Resolution order, same as scripts/backfill-appointment-clinicid.js: the
// linked patient's own clinicId first, then the platform's default tenant,
// then the oldest active clinic as a last resort — a best-effort guess for a
// handful of historical rows is an acceptable trade a live request should
// never make. Idempotent: only ever touches rows where clinicId IS NULL.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDefaultClinicId() {
  const slug = process.env.DEFAULT_CLINIC_SLUG;
  if (slug) {
    const clinic = await prisma.clinic.findUnique({ where: { slug }, select: { id: true, isActive: true } });
    return clinic?.isActive ? clinic.id : null;
  }
  const active = await prisma.clinic.findMany({ where: { isActive: true }, select: { id: true }, take: 2 });
  return active.length === 1 ? active[0].id : null;
}

async function getOldestActiveClinicId() {
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return clinic?.id || null;
}

async function main() {
  const orphans = await prisma.emailMessage.findMany({
    where: { clinicId: null },
    select: { id: true, patientId: true },
  });

  if (orphans.length === 0) {
    console.log('[backfill-email-message-clinicid] No orphaned emails — nothing to do.');
    return;
  }

  const patientIds = orphans.map((r) => r.patientId).filter(Boolean);
  const patients = patientIds.length
    ? await prisma.user.findMany({ where: { id: { in: patientIds } }, select: { id: true, clinicId: true } })
    : [];
  const patientClinicById = new Map(patients.map((p) => [p.id, p.clinicId]));

  let defaultClinicId;
  let oldestClinicId;
  let resolved = 0;
  let skipped = 0;

  for (const row of orphans) {
    let clinicId = (row.patientId && patientClinicById.get(row.patientId)) || null;
    if (!clinicId) {
      if (defaultClinicId === undefined) defaultClinicId = await getDefaultClinicId();
      clinicId = defaultClinicId;
    }
    if (!clinicId) {
      if (oldestClinicId === undefined) oldestClinicId = await getOldestActiveClinicId();
      clinicId = oldestClinicId;
    }
    if (!clinicId) {
      skipped++;
      console.error(`[backfill-email-message-clinicid] EmailMessage ${row.id}: no clinic could be resolved — left null (will keep being invisible to every clinic's own inbox until fixed manually).`);
      continue;
    }
    await prisma.emailMessage.update({ where: { id: row.id }, data: { clinicId } });
    resolved++;
  }

  console.log(`[backfill-email-message-clinicid] Resolved ${resolved} email(s), skipped ${skipped}.`);
}

main()
  .catch((err) => console.error('[backfill-email-message-clinicid] Error:', err.message))
  .finally(() => prisma.$disconnect());
