// Activity 45: protocol templates belong to a clinic, and every template
// route now filters by it. Templates created before this have no clinicId
// and would vanish from every clinic's list — this gives each one, in order:
//   1. the clinic that owns the exercises it links (when they're all one
//      clinic's) — assigning only keeps links to the template clinic's own
//      exercises, and the ACL seed puts its exercises on a clinic that isn't
//      necessarily its author's;
//   2. the clinic of the staff member who created it;
//   3. the platform's own clinic (same slug the ACL seed uses).
// Idempotent: only touches rows still without a clinic.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FALLBACK_SLUG = process.env.DEFAULT_CLINIC_SLUG || 'bruno-physical-rehab';

async function main() {
  const orphans = await prisma.protocolTemplate.findMany({
    where: { clinicId: null },
    select: {
      id: true,
      name: true,
      createdBy: { select: { clinicId: true } },
      items: { where: { exerciseId: { not: null } }, select: { exercise: { select: { clinicId: true } } } },
    },
  });

  if (orphans.length === 0) {
    console.log('[backfill-protocol-template-clinicid] No templates without a clinic — nothing to do.');
    return;
  }

  let fallbackClinicId;
  let updated = 0;
  let skipped = 0;
  for (const t of orphans) {
    const exerciseClinics = [...new Set(t.items.map((it) => it.exercise?.clinicId).filter(Boolean))];
    let clinicId = (exerciseClinics.length === 1 ? exerciseClinics[0] : null) || t.createdBy?.clinicId || null;
    if (!clinicId) {
      if (fallbackClinicId === undefined) {
        const clinic = await prisma.clinic.findUnique({ where: { slug: FALLBACK_SLUG }, select: { id: true } });
        fallbackClinicId = clinic?.id || null;
      }
      clinicId = fallbackClinicId;
    }
    if (!clinicId) {
      skipped++;
      console.log(`[backfill-protocol-template-clinicid] No clinic for "${t.name}" (${t.id}) — left as is.`);
      continue;
    }
    // Guarded by clinicId: null so a concurrent boot can't overwrite a value.
    const res = await prisma.protocolTemplate.updateMany({ where: { id: t.id, clinicId: null }, data: { clinicId } });
    updated += res.count;
  }
  console.log(`[backfill-protocol-template-clinicid] Updated ${updated} template(s), skipped ${skipped}.`);
}

main()
  .catch((err) => {
    console.error('[backfill-protocol-template-clinicid] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
