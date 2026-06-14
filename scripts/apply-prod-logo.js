/**
 * apply-prod-logo.js
 * Fetches screenLogos + text settings from production and saves locally.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📡 Fetching from https://bpr.rehab/api/settings …');
  const res = await fetch('https://bpr.rehab/api/settings');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const prod = await res.json();

  const local = await prisma.siteSettings.findFirst();
  if (!local) throw new Error('No local SiteSettings found — run seed first.');

  // Direct-copy fields (text + JSON objects already parsed by API)
  const update = {
    screenLogos: prod.screenLogos ?? undefined,
    siteName:    prod.siteName    ?? undefined,
    tagline:     prod.tagline     ?? undefined,
    phone:       prod.phone       ?? undefined,
    email:       prod.email       ?? undefined,
    address:     prod.address     ?? undefined,
    whatsappNumber:  prod.whatsappNumber  ?? undefined,
    whatsappEnabled: prod.whatsappEnabled ?? undefined,
    whatsappMessage: prod.whatsappMessage ?? undefined,
    footerText:      prod.footerText      ?? undefined,
    socialLinksJson: prod.socialLinksJson ?? undefined,
    footerLinksJson: prod.footerLinksJson ?? undefined,
    footerModulesJson: prod.footerModulesJson ?? undefined,
    mlsLaserJson:    prod.mlsLaserJson   ?? undefined,
    thermoJson:      prod.thermoJson     ?? undefined,
    servicesJson:    prod.servicesJson   ?? undefined,
  };

  // Remove undefined keys so Prisma doesn't set them to null
  Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

  console.log('Fields to update:', Object.keys(update).join(', '));

  if (prod.screenLogos) {
    const keys = Object.keys(prod.screenLogos);
    console.log('screenLogos screens:', keys.join(', '));
    const logoSize = JSON.stringify(prod.screenLogos).length;
    console.log(`screenLogos size: ${logoSize} chars`);
  }

  await prisma.siteSettings.update({ where: { id: local.id }, data: update });
  console.log('✅ Local SiteSettings updated.');

  // Verify
  const saved = await prisma.siteSettings.findFirst();
  const sl = saved.screenLogos;
  if (sl && sl.landingHeader) {
    const logoStart = sl.landingHeader.logoUrl ? sl.landingHeader.logoUrl.substring(0, 40) : 'empty';
    console.log('✅ Verified landingHeader.logoUrl:', logoStart, '…');
  } else {
    console.warn('⚠ screenLogos.landingHeader not found in saved record');
  }

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
