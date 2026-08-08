// Emergency bootstrap: creates the single BPR Clinic row if (and only if) NO
// Clinic exists in the database at all. Written after discovering that the
// Aug 2026 VPS reinstall wiped the Clinic table along with everything else,
// and none of the other recovery seed scripts ever recreated it — so
// lib/resolve-clinic-id.ts's fallback ("first clinic in the DB") had nothing
// to fall back to, causing "No clinic context" errors across every
// clinic-scoped feature (Instagram/Facebook connect, social accounts, etc.)
// even after admin login and other content were restored.
//
// Safety: bails out immediately if ANY row exists in "Clinic" — so once this
// runs once, it's permanently a no-op and safe to leave in start.sh.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const anyClinic = await prisma.clinic.findFirst();
  if (anyClinic) {
    console.log('[seed-clinic] A Clinic already exists — skipping (this only ever runs on a truly empty table).');
    return;
  }

  const clinic = await prisma.clinic.create({
    data: {
      name: 'BPR Physical Rehabilitation',
      slug: 'bruno-physical-rehab',
      email: 'admin@bpr.rehab',
      address: 'Ipswich, Suffolk, UK',
      city: 'Ipswich',
      country: 'GB',
    },
  });

  console.log(`[seed-clinic] Created Clinic "${clinic.name}" (id: ${clinic.id}).`);
}

main()
  .catch((err) => console.error('[seed-clinic] Error:', err.message))
  .finally(() => prisma.$disconnect());
