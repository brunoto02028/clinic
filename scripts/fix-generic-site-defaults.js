// One-off, idempotent: app/api/settings/route.ts auto-creates a SiteSettings
// row with generic template placeholder content the first time /api/settings
// is hit on an empty DB (wrong city "Richmond" instead of Ipswich, a fake
// address, a placeholder phone number, generic hero copy). That happened for
// real on production after the Aug 2026 DB wipe — this script corrects it.
//
// Safety: only overwrites a field when its CURRENT value exactly matches the
// known-bad template string. If Bruno has already edited a field via
// /admin/settings (even to something else entirely), it no longer matches
// and is left untouched. Run automatically on every deploy via start.sh.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// [field]: [badValue, goodValue]
const FIXES = {
  heroSubtitle: [
    'Expert physical rehabilitation and sports therapy in Richmond, UK. Helping you move better, feel stronger, and live pain-free through evidence-based treatments and personalised care.',
    'Expert physical rehabilitation and sports therapy in Ipswich, Suffolk. Helping you move better, feel stronger, and live pain-free through evidence-based treatments and personalised care.',
  ],
  heroTitle: [
    'Adjust Your Body Get A Perfect Balance',
    "Find the Real Cause of Your Pain — Not Just Where It Hurts",
  ],
  phone: [
    '+44 7XXX XXXXXX',
    '',
  ],
  address: [
    'The Vineyard, Richmond TW10 6AQ',
    'Ipswich, Suffolk, UK',
  ],
  metaDescription: [
    'Professional physical rehabilitation and sports therapy services in Richmond, London. Expert treatment for injuries, chronic pain, and optimal physical performance.',
    'Professional physical rehabilitation and sports therapy services in Ipswich, Suffolk. Expert treatment for injuries, chronic pain, and optimal physical performance.',
  ],
  metaKeywords: [
    'physical rehabilitation, sports therapy, Richmond, London, physical therapy, injury treatment, pain management',
    'physical rehabilitation, sports therapy, Ipswich, Suffolk, physical therapy, injury treatment, pain management',
  ],
};

async function main() {
  const existing = await prisma.siteSettings.findFirst();
  if (!existing) {
    console.log('[fix-generic-site-defaults] No SiteSettings row yet — nothing to fix.');
    return;
  }

  const data = {};
  for (const [field, [badValue, goodValue]] of Object.entries(FIXES)) {
    if (existing[field] === badValue) data[field] = goodValue;
  }

  if (Object.keys(data).length > 0) {
    await prisma.siteSettings.update({ where: { id: existing.id }, data });
    console.log('[fix-generic-site-defaults] Corrected field(s):', Object.keys(data).join(', '));
  } else {
    console.log('[fix-generic-site-defaults] Nothing to fix (already corrected or already customised).');
  }
}

main()
  .catch((err) => console.error('[fix-generic-site-defaults] Error:', err.message))
  .finally(() => prisma.$disconnect());
