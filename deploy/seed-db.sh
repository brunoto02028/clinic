#!/bin/bash
set -e
cd /root/clinic

node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seed() {
  const prisma = new PrismaClient();
  
  try {
    // Create clinic
    const clinic = await prisma.clinic.create({
      data: {
        name: 'Bruno Physical Rehabilitation',
        slug: 'bruno-physical-rehabilitation',
        email: 'admin@brunophysicalrehabilitation.co.uk',
        phone: '+44 7XXX XXXXXX',
        address: 'London',
        city: 'London',
        postcode: 'SW1A 1AA',
        isActive: true,
      }
    });
    console.log('Clinic created:', clinic.id);

    // Create Super Admin
    const hashedPassword = await bcrypt.hash('Bruno@Admin2026!', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@brunophysicalrehabilitation.co.uk',
        password: hashedPassword,
        firstName: 'Bruno',
        lastName: 'Admin',
        role: 'SUPERADMIN',
        isActive: true,
        emailVerified: new Date(),
        clinicId: clinic.id,
      }
    });
    console.log('Super Admin created:', admin.id);

    // Create site settings
    await prisma.siteSettings.create({
      data: {
        clinicId: clinic.id,
        siteName: 'Bruno Physical Rehabilitation',
        heroTitle: 'Expert Physiotherapy & Sports Rehabilitation',
        heroSubtitle: 'Professional care for your recovery journey',
        aboutText: 'We provide expert physiotherapy and sports rehabilitation services.',
        metaTitle: 'Bruno Physical Rehabilitation | Physiotherapy & Sports Rehab',
        metaDescription: 'Professional physiotherapy and sports rehabilitation in London.',
      }
    });
    console.log('Site settings created');

    console.log('SEED_COMPLETE');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

seed();
"
