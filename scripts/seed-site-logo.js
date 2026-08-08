// One-off, idempotent: sets the default BPR logo/favicon recovered after
// the Aug 2026 VPS reinstall wiped SiteSettings. Run automatically on every
// deploy via start.sh, same pattern as scripts/seed-book-content.js — only
// fills in fields that are still empty, never overwrites an admin's choice
// made later via /admin/settings.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULTS = {
  logoUrl: '/logo.png', // full-colour "bpr" mark — light backgrounds
  darkLogoUrl: '/logo-dark.png', // cream/white version — dark backgrounds
  faviconUrl: '/favicon.png', // cropped icon-only mark (no wordmark), square
};

async function main() {
  const existing = await prisma.siteSettings.findFirst();

  if (!existing) {
    await prisma.siteSettings.create({ data: DEFAULTS });
    console.log('[seed-site-logo] Created SiteSettings with default logo/favicon.');
    return;
  }

  const data = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (!existing[key]) data[key] = value;
  }

  if (Object.keys(data).length > 0) {
    await prisma.siteSettings.update({ where: { id: existing.id }, data });
    console.log('[seed-site-logo] Set default field(s) on existing SiteSettings:', Object.keys(data).join(', '));
  }
}

main()
  .catch((err) => console.error('[seed-site-logo] Error:', err.message))
  .finally(() => prisma.$disconnect());
