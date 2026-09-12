// One-off, TRUE-once (activity 36): the "Import from Instagram" scraper
// downloads and permanently re-hosts video from any post/profile, not just
// the tenant's own — a copyright-exposure risk we don't want open by default
// for every personal-trainer tenant. This backfill turns the flag ON once
// for CLINIC-type tenants (preserving the access they already had before
// the gate existed).
//
// Unlike the colour-migration script this is patterned after, `false` here
// isn't just "still on the old default" — it's also the state a SUPERADMIN
// lands on by deliberately switching a CLINIC's toggle off in /admin/clinics
// (e.g. after a copyright complaint). Matching on `instagramImportEnabled:
// false` on every boot would silently re-enable that clinic on the next
// deploy, defeating the toggle. A SystemConfig marker makes this run
// genuinely once, not "once per still-false row".
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MARKER_KEY = 'instagram-import-clinic-backfill-done';

async function main() {
  const marker = await prisma.systemConfig.findUnique({ where: { key: MARKER_KEY } });
  if (marker) {
    console.log('[backfill-instagram-import-flag] Already ran — skipping (SUPERADMIN toggles in /admin/clinics are the source of truth from here on).');
    return;
  }

  const result = await prisma.clinic.updateMany({
    where: { type: 'CLINIC', instagramImportEnabled: false },
    data: { instagramImportEnabled: true },
  });

  await prisma.systemConfig.create({
    data: {
      key: MARKER_KEY,
      value: 'true',
      label: 'Instagram import CLINIC backfill done',
      description: 'One-time marker (activity 36) — prevents the boot backfill from re-enabling instagramImportEnabled on a CLINIC tenant a SUPERADMIN deliberately disabled.',
      category: 'migration',
      isSecret: false,
    },
  });

  console.log(`[backfill-instagram-import-flag] Enabled instagramImportEnabled on ${result.count} CLINIC-type tenant(s). Marker recorded — won't run again.`);
}

main()
  .catch((err) => console.error('[backfill-instagram-import-flag] Error:', err.message))
  .finally(() => prisma.$disconnect());
