/**
 * sync-from-prod.js
 * Fetches SiteSettings + images from production (bpr.rehab)
 * and applies them to the local database.
 *
 * Usage:  node scripts/sync-from-prod.js
 */

const { PrismaClient } = require('@prisma/client');

const PROD_BASE = 'https://bpr.rehab';
const prisma = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || 'image/webp';
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString('base64')}`;
}

/**
 * If a value looks like "/api/image-serve/SOME_ID", fetch the image from
 * production, store it in local ImageLibrary, and return the new serve URL.
 * Otherwise return the value unchanged.
 */
async function resolveImageUrl(rawUrl, adminUserId) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  if (!rawUrl.startsWith('/api/image-serve/')) return rawUrl;

  const prodId = rawUrl.replace('/api/image-serve/', '');
  const prodUrl = `${PROD_BASE}/api/image-serve/${prodId}`;

  console.log(`  → fetching image ${prodId} from production…`);
  const base64 = await fetchImageAsBase64(prodUrl);
  if (!base64) {
    console.warn(`  ⚠ could not fetch image ${prodId} — skipping`);
    return rawUrl; // leave as-is; will 404 locally but won't crash
  }

  const existing = await prisma.imageLibrary.findFirst({
    where: { originalName: `prod_${prodId}` },
    select: { id: true },
  });
  if (existing) {
    console.log(`  ✓ already in local DB → /api/image-serve/${existing.id}`);
    return `/api/image-serve/${existing.id}`;
  }

  const mimeType = base64.split(';')[0].replace('data:', '');
  const newRec = await prisma.imageLibrary.create({
    data: {
      fileName: `prod_${prodId}.webp`,
      originalName: `prod_${prodId}`,
      fileSize: Buffer.from(base64.split(',')[1], 'base64').length,
      mimeType,
      imageUrl: base64,
      cloud_storage_path: 'dataurl:inline',
      altText: null,
      category: 'settings',
      uploadedById: adminUserId,
    },
  });

  console.log(`  ✓ stored locally → /api/image-serve/${newRec.id}`);
  return `/api/image-serve/${newRec.id}`;
}

/**
 * Walk through a JSON object/array and resolve all image-serve URLs.
 */
async function resolveImagesInJson(obj, adminUserId) {
  if (!obj) return obj;
  if (typeof obj === 'string') return resolveImageUrl(obj, adminUserId);
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(v => resolveImagesInJson(v, adminUserId)));
  }
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = await resolveImagesInJson(v, adminUserId);
    }
    return out;
  }
  return obj;
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('📡 Fetching production settings from', PROD_BASE);

  let prodSettings;
  try {
    prodSettings = await fetchJson(`${PROD_BASE}/api/settings`);
  } catch (e) {
    console.error('❌ Could not reach production API:', e.message);
    console.error('   Make sure you are connected to the internet and bpr.rehab is reachable.');
    process.exit(1);
  }

  console.log('✅ Production settings received. Resolving images…\n');

  // Get local admin user ID (needed as uploader FK)
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ['SUPERADMIN', 'ADMIN'] } },
    select: { id: true },
  });
  if (!adminUser) throw new Error('No admin user in local DB — run seed first.');
  const adminUserId = adminUser.id;

  // Fields in SiteSettings that are direct image URLs
  const IMAGE_URL_FIELDS = [
    'logoUrl', 'darkLogoUrl', 'faviconUrl',
    'heroImageUrl', 'aboutImageUrl',
    'insolesImageUrl', 'bioImageUrl', 'thermoImageUrl',
  ];

  const update = {};

  // -- scalar text fields (copy directly) --
  const TEXT_FIELDS = [
    'siteName', 'tagline',
    'heroTitle', 'heroSubtitle', 'heroCTA', 'heroCTALink',
    'portalTitle', 'portalSubtitle', 'portalText',
    'servicesTitle', 'servicesSubtitle',
    'aboutTitle', 'aboutText',
    'articlesTitle', 'articlesSubtitle',
    'articlesPlaceholderTitle', 'articlesPlaceholderText',
    'contactTitle', 'contactSubtitle', 'contactText',
    'phone', 'email', 'address',
    'footerText',
    'insolesTitle', 'insolesSubtitle', 'insolesDesc',
    'bioTitle', 'bioSubtitle', 'bioDesc',
    'whatsappNumber', 'whatsappEnabled', 'whatsappMessage',
  ];

  for (const f of TEXT_FIELDS) {
    if (prodSettings[f] !== undefined) update[f] = prodSettings[f];
  }

  // -- image URL fields --
  for (const f of IMAGE_URL_FIELDS) {
    if (prodSettings[f]) {
      console.log(`Processing field: ${f}`);
      update[f] = await resolveImageUrl(prodSettings[f], adminUserId);
    }
  }

  // -- JSON fields that may contain nested image URLs --
  const JSON_FIELDS = [
    'screenLogos', 'servicesJson', 'mlsLaserJson', 'thermoJson',
    'insolesBenefitsJson', 'insolesStepsJson',
    'bioBenefitsJson', 'bioStepsJson',
    'contactCardsJson', 'footerLinksJson', 'socialLinksJson',
    'footerModulesJson', 'navigationJson', 'portalFeaturesJson',
  ];

  for (const f of JSON_FIELDS) {
    const raw = prodSettings[f];
    if (!raw) continue;
    console.log(`Processing JSON field: ${f}`);
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const resolved = await resolveImagesInJson(parsed, adminUserId);
      update[f] = typeof raw === 'string' ? JSON.stringify(resolved) : resolved;
    } catch {
      update[f] = raw; // leave as-is if parsing fails
    }
  }

  // -- upsert local SiteSettings --
  console.log('\n💾 Saving to local database…');
  const existing = await prisma.siteSettings.findFirst();
  if (existing) {
    await prisma.siteSettings.update({ where: { id: existing.id }, data: update });
    console.log('✅ SiteSettings updated (id:', existing.id, ')');
  } else {
    await prisma.siteSettings.create({ data: update });
    console.log('✅ SiteSettings created.');
  }

  console.log('\n🎉 Sync complete! Restart the dev server to see changes.');
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
