/**
 * set-section-images.js
 * Sets the MLS laser images (already present in /public/uploads/)
 * and populates remaining section images with relevant Unsplash photos
 * so the local dev environment looks complete.
 *
 * Usage: node scripts/set-section-images.js
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fileToBase64(relPath) {
  const fullPath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fullPath)) return null;
  const buf = fs.readFileSync(fullPath);
  const ext = path.extname(relPath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
              : ext === '.png' ? 'image/png'
              : ext === '.webp' ? 'image/webp'
              : 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function storeImage(relPath, originalName, category, adminUserId) {
  const b64 = await fileToBase64(relPath);
  if (!b64) { console.warn(`  ⚠ File not found: ${relPath}`); return null; }

  const existing = await prisma.imageLibrary.findFirst({
    where: { originalName },
    select: { id: true },
  });
  if (existing) {
    console.log(`  ✓ Already in DB: ${originalName} → /api/image-serve/${existing.id}`);
    return `/api/image-serve/${existing.id}`;
  }

  const mime = b64.split(';')[0].replace('data:', '');
  const rec = await prisma.imageLibrary.create({
    data: {
      fileName: originalName,
      originalName,
      fileSize: Buffer.from(b64.split(',')[1], 'base64').length,
      mimeType: mime,
      imageUrl: b64,
      cloud_storage_path: 'dataurl:inline',
      altText: null,
      category,
      uploadedById: adminUserId,
    },
  });
  console.log(`  ✓ Stored: ${originalName} → /api/image-serve/${rec.id}`);
  return `/api/image-serve/${rec.id}`;
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
    select: { id: true },
  });
  if (!admin) throw new Error('No admin user — run seed first.');

  const settings = await prisma.siteSettings.findFirst();
  if (!settings) throw new Error('No SiteSettings — run seed first.');

  console.log('\n── MLS Laser images (static files) ──');
  const mlsTreatmentUrl = await storeImage('public/uploads/mls-laser-treatment.jpg', 'mls-laser-treatment.jpg', 'settings', admin.id);
  const mlsDeviceUrl    = await storeImage('public/uploads/mls-laser-device.jpg',    'mls-laser-device.jpg',    'settings', admin.id);

  // Build or update mlsLaserJson
  let mls = {};
  try { mls = settings.mlsLaserJson ? JSON.parse(settings.mlsLaserJson) : {}; } catch {}
  if (mlsTreatmentUrl) mls.treatmentImageUrl = mlsTreatmentUrl;
  if (mlsDeviceUrl)    mls.deviceImageUrl    = mlsDeviceUrl;

  // Ensure sensible MLS defaults if not already set by production
  if (!mls.label)       mls.label       = 'MLS Laser Therapy';
  if (!mls.title)       mls.title       = 'Precision';
  if (!mls.title2)      mls.title2      = 'Pain Relief';
  if (!mls.ctaLink)     mls.ctaLink     = '/signup';
  if (!mls.learnMoreLink) mls.learnMoreLink = '/services/laser-shockwave';

  const update = {
    mlsLaserJson: JSON.stringify(mls),
  };

  // Section image URLs — use Unsplash for hero/about/insoles/bio/thermo
  // These are stable, no-CORS, production-quality images relevant to physiotherapy.
  const SECTION_IMAGES = {
    heroImageUrl:    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80',
    aboutImageUrl:   'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    insolesImageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    bioImageUrl:     'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    thermoImageUrl:  'https://images.unsplash.com/photo-1551076805-e1869033e561?w=800&q=80',
  };

  console.log('\n── Section fallback images (Unsplash) ──');
  for (const [field, url] of Object.entries(SECTION_IMAGES)) {
    // Only set if not already configured
    if (!settings[field]) {
      update[field] = url;
      console.log(`  ✓ ${field} → ${url.substring(0, 60)}…`);
    } else {
      console.log(`  — ${field}: already set, skipping`);
    }
  }

  await prisma.siteSettings.update({ where: { id: settings.id }, data: update });
  console.log('\n✅ Settings updated. Restart the dev server to see changes.');
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('Error:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
