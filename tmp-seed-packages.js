const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const CLINIC_ID = 'cmlk1dsn80000l6ui71xh5ky9';

const PACKAGES = [
  {
    name: 'Starter Pack — 4 Sessions',
    description: 'Ideal for acute injuries, mild pain, or initial assessment + treatment. Each session includes all necessary modalities (laser, ultrasound, TENS, microcurrent, manual therapy).',
    price: 260,
    currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION'],
    durationDays: 30,
    sessionsIncluded: 4,
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Recovery Pack — 8 Sessions',
    description: 'For moderate injuries, tendinopathy, post-surgical initial recovery. Combines all treatment modalities per session with progressive rehabilitation.',
    price: 480,
    currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION', 'BODY_ASSESSMENT'],
    durationDays: 60,
    sessionsIncluded: 8,
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Intensive Pack — 12 Sessions',
    description: 'Complete rehabilitation for chronic injuries, persistent pain, or complex conditions. Includes body assessment, foot scan, and all treatment modalities.',
    price: 660,
    currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION', 'BODY_ASSESSMENT', 'FOOT_SCAN'],
    durationDays: 90,
    sessionsIncluded: 12,
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Full Rehabilitation — 20 Sessions',
    description: 'Comprehensive post-operative or severe injury rehabilitation. Full access to all services and modalities with progressive treatment plan over extended period.',
    price: 1000,
    currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION', 'BODY_ASSESSMENT', 'FOOT_SCAN'],
    durationDays: 180,
    sessionsIncluded: 20,
    isActive: true,
    sortOrder: 4,
  },
];

(async () => {
  console.log('=== SEEDING TREATMENT PACKAGES ===\n');
  
  for (const pkg of PACKAGES) {
    try {
      const existing = await p.$queryRawUnsafe(
        `SELECT id FROM "ServicePackage" WHERE "clinicId" = $1 AND "name" = $2 LIMIT 1`,
        CLINIC_ID, pkg.name
      );
      if (existing.length > 0) {
        console.log(`  SKIP: "${pkg.name}" already exists`);
        continue;
      }
      
      await p.$executeRawUnsafe(
        `INSERT INTO "ServicePackage" (id, "clinicId", name, description, price, currency, "includedServices", "durationDays", "sessionsIncluded", "isActive", "sortOrder", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        CLINIC_ID, pkg.name, pkg.description, pkg.price, pkg.currency,
        JSON.stringify(pkg.includedServices), pkg.durationDays, pkg.sessionsIncluded,
        pkg.isActive, pkg.sortOrder
      );
      console.log(`  CREATED: "${pkg.name}" — £${pkg.price} (${pkg.sessionsIncluded} sessions)`);
    } catch (e) {
      console.log(`  ERROR: "${pkg.name}" — ${e.message?.slice(0, 80)}`);
    }
  }
  
  // Also seed the TREATMENT_SESSION service price if not exists
  try {
    const existing = await p.$queryRawUnsafe(
      `SELECT id FROM "ServicePricing" WHERE "clinicId" = $1 AND "serviceType" = 'TREATMENT_SESSION' LIMIT 1`,
      CLINIC_ID
    );
    if (existing.length === 0) {
      await p.$executeRawUnsafe(
        `INSERT INTO "ServicePricing" (id, "clinicId", "serviceType", name, description, price, currency, "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'TREATMENT_SESSION', 'Treatment Session', 'In-person treatment session combining multiple modalities (laser, ultrasound, TENS, manual therapy, etc.).', 65, 'GBP', true, NOW(), NOW())`,
        CLINIC_ID
      );
      console.log('\n  CREATED: Treatment Session service price — £65');
    } else {
      console.log('\n  SKIP: Treatment Session service price already exists');
    }
  } catch (e) {
    console.log(`\n  Service price note: ${e.message?.slice(0, 80)}`);
  }
  
  console.log('\n=== DONE ===');
  await p.$disconnect();
})();
