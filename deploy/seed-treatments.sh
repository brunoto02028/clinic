#!/bin/bash
set -e
cd /root/clinic

node -e "
const { PrismaClient } = require('@prisma/client');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    // Get the clinic
    const clinic = await prisma.clinic.findFirst({ where: { isActive: true } });
    if (!clinic) { console.log('No clinic found'); return; }
    console.log('Clinic:', clinic.id, clinic.name);

    // Check if treatments already exist
    const existing = await prisma.treatmentType.count({ where: { clinicId: clinic.id } });
    if (existing > 0) { console.log('Treatments already seeded:', existing); return; }

    const treatments = [
      { name: 'Initial Assessment', description: 'Comprehensive first consultation including full medical history, physical examination, and treatment plan development.', duration: 60, price: 75, sortOrder: 0 },
      { name: 'Follow-up Treatment', description: 'Standard follow-up session for ongoing rehabilitation and treatment progression.', duration: 45, price: 60, sortOrder: 1 },
      { name: 'Sports Massage Therapy', description: 'Deep tissue massage targeting specific muscle groups for injury prevention and recovery.', duration: 45, price: 55, sortOrder: 2 },
      { name: 'Electrotherapy Session', description: 'Advanced electrotherapy treatment including TENS, EMS, or ultrasound therapy.', duration: 30, price: 50, sortOrder: 3 },
      { name: 'Shockwave Therapy', description: 'Extracorporeal shockwave therapy for chronic conditions and tendinopathies.', duration: 30, price: 70, sortOrder: 4 },
      { name: 'Biomechanical Assessment', description: 'Full biomechanical analysis including gait assessment and postural evaluation.', duration: 60, price: 85, sortOrder: 5 },
      { name: 'Post-Surgery Rehabilitation', description: 'Specialised rehabilitation programme following surgical procedures.', duration: 60, price: 75, sortOrder: 6 },
      { name: 'Dry Needling / Acupuncture', description: 'Targeted dry needling or acupuncture for pain relief and muscle tension.', duration: 30, price: 55, sortOrder: 7 },
    ];

    for (const t of treatments) {
      await prisma.treatmentType.create({
        data: { ...t, clinicId: clinic.id, isActive: true, currency: 'GBP' },
      });
    }
    console.log('Seeded', treatments.length, 'treatment types');
    console.log('SEED_OK');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

seed();
"
