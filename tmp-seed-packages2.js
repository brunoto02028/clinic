const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const CLINIC_ID = 'cmlk1dsn80000l6ui71xh5ky9';

const PACKAGES = [
  {
    name: 'Starter Pack \u2014 4 Sessions',
    description: 'Ideal for acute injuries, mild pain, or initial assessment + treatment. Each session includes all necessary modalities (laser, ultrasound, TENS, microcurrent, manual therapy).',
    price: 260, currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION'],
    durationDays: 30, sessionsIncluded: 4, isActive: true, sortOrder: 1,
  },
  {
    name: 'Recovery Pack \u2014 8 Sessions',
    description: 'For moderate injuries, tendinopathy, post-surgical initial recovery. Combines all treatment modalities per session with progressive rehabilitation.',
    price: 480, currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION', 'BODY_ASSESSMENT'],
    durationDays: 60, sessionsIncluded: 8, isActive: true, sortOrder: 2,
  },
  {
    name: 'Intensive Pack \u2014 12 Sessions',
    description: 'Complete rehabilitation for chronic injuries, persistent pain, or complex conditions. Includes body assessment, foot scan, and all treatment modalities.',
    price: 660, currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION', 'BODY_ASSESSMENT', 'FOOT_SCAN'],
    durationDays: 90, sessionsIncluded: 12, isActive: true, sortOrder: 3,
  },
  {
    name: 'Full Rehabilitation \u2014 20 Sessions',
    description: 'Comprehensive post-operative or severe injury rehabilitation. Full access to all services and modalities with progressive treatment plan.',
    price: 1000, currency: 'GBP',
    includedServices: ['CONSULTATION', 'TREATMENT_SESSION', 'BODY_ASSESSMENT', 'FOOT_SCAN'],
    durationDays: 180, sessionsIncluded: 20, isActive: true, sortOrder: 4,
  },
];

(async () => {
  console.log('=== SEEDING TREATMENT PACKAGES ===\n');

  for (const pkg of PACKAGES) {
    const existing = await p.servicePackage.findFirst({ where: { clinicId: CLINIC_ID, name: pkg.name } });
    if (existing) { console.log('  SKIP:', pkg.name); continue; }
    await p.servicePackage.create({ data: { clinicId: CLINIC_ID, ...pkg } });
    console.log('  CREATED:', pkg.name, '- \u00a3' + pkg.price, '(' + pkg.sessionsIncluded + ' sessions)');
  }

  // Seed TREATMENT_SESSION service price
  const existingPrice = await p.servicePrice.findFirst({ where: { clinicId: CLINIC_ID, serviceType: 'TREATMENT_SESSION' } });
  if (!existingPrice) {
    await p.servicePrice.create({
      data: {
        clinicId: CLINIC_ID, serviceType: 'TREATMENT_SESSION',
        name: 'Treatment Session',
        description: 'In-person treatment session combining multiple modalities.',
        price: 65, currency: 'GBP', isActive: true,
      },
    });
    console.log('\n  CREATED: Treatment Session price - \u00a365');
  } else {
    console.log('\n  SKIP: Treatment Session price already exists');
  }

  // Verify
  const count = await p.servicePackage.count({ where: { clinicId: CLINIC_ID, isActive: true } });
  console.log('\nActive packages in clinic:', count);
  console.log('\n=== DONE ===');
  await p.$disconnect();
})();
