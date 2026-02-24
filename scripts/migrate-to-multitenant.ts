/**
 * Migration Script: Single-Tenant to Multi-Tenant
 * 
 * This script:
 * 1. Creates the default "Bruno Physical Rehabilitation" clinic
 * 2. Associates all existing data with this clinic
 * 3. Creates a default subscription for the clinic
 * 
 * Run with: npx tsx --require dotenv/config scripts/migrate-to-multitenant.ts
 */

import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToMultiTenant() {
  console.log('\n🚀 Starting Multi-Tenant Migration...\n');

  try {
    // Step 1: Create the default clinic
    console.log('1️⃣  Creating default clinic...');
    
    const defaultClinic = await prisma.clinic.upsert({
      where: { slug: 'bruno-physical-rehabilitation' },
      update: {},
      create: {
        name: 'Bruno Physical Rehabilitation',
        slug: 'bruno-physical-rehabilitation',
        email: 'admin@bpr.rehab',
        phone: '+44 20 1234 5678',
        address: '123 Richmond Road',
        city: 'Richmond',
        postcode: 'TW10 6RE',
        country: 'GB',
        primaryColor: '#607d7d',
        secondaryColor: '#5dc9c0',
        timezone: 'Europe/London',
        currency: 'GBP',
        isActive: true,
      },
    });
    
    console.log(`   ✅ Clinic created: ${defaultClinic.name} (ID: ${defaultClinic.id})`);

    // Step 2: Create subscription for the clinic
    console.log('\n2️⃣  Creating subscription...');
    
    const subscription = await prisma.subscription.upsert({
      where: { clinicId: defaultClinic.id },
      update: {},
      create: {
        clinicId: defaultClinic.id,
        plan: SubscriptionPlan.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
        maxTherapists: 999,
        maxPatients: 9999,
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });
    
    console.log(`   ✅ Subscription created: ${subscription.plan} (ID: ${subscription.id})`);

    // Step 3: Associate all users with the clinic
    console.log('\n3️⃣  Associating users with clinic...');
    
    const usersUpdated = await prisma.user.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${usersUpdated.count} users associated with clinic`);

    // Step 4: Associate all appointments with the clinic
    console.log('\n4️⃣  Associating appointments with clinic...');
    
    const appointmentsUpdated = await prisma.appointment.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${appointmentsUpdated.count} appointments associated`);

    // Step 5: Associate SOAP notes with the clinic
    console.log('\n5️⃣  Associating SOAP notes with clinic...');
    
    const soapNotesUpdated = await prisma.sOAPNote.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${soapNotesUpdated.count} SOAP notes associated`);

    // Step 6: Associate medical screenings with the clinic
    console.log('\n6️⃣  Associating medical screenings with clinic...');
    
    const screeningsUpdated = await prisma.medicalScreening.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${screeningsUpdated.count} medical screenings associated`);

    // Step 7: Associate payments with the clinic
    console.log('\n7️⃣  Associating payments with clinic...');
    
    const paymentsUpdated = await prisma.payment.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${paymentsUpdated.count} payments associated`);

    // Step 8: Associate articles with the clinic
    console.log('\n8️⃣  Associating articles with clinic...');
    
    const articlesUpdated = await prisma.article.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${articlesUpdated.count} articles associated`);

    // Step 9: Associate image library with the clinic
    console.log('\n9️⃣  Associating image library with clinic...');
    
    const imagesUpdated = await prisma.imageLibrary.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${imagesUpdated.count} images associated`);

    // Step 10: Associate therapist availability with the clinic
    console.log('\n🔟 Associating therapist availability with clinic...');
    
    const availabilityUpdated = await prisma.therapistAvailability.updateMany({
      where: { clinicId: null },
      data: { clinicId: defaultClinic.id },
    });
    
    console.log(`   ✅ ${availabilityUpdated.count} availability records associated`);

    // Step 11: Associate site settings with the clinic
    console.log('\n1️⃣1️⃣ Associating site settings with clinic...');
    
    const siteSettings = await prisma.siteSettings.findFirst({
      where: { clinicId: null },
    });
    
    if (siteSettings) {
      await prisma.siteSettings.update({
        where: { id: siteSettings.id },
        data: { clinicId: defaultClinic.id },
      });
      console.log('   ✅ Site settings associated');
    } else {
      console.log('   ℹ️  No site settings found to associate');
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`\nDefault Clinic: ${defaultClinic.name}`);
    console.log(`Slug: ${defaultClinic.slug}`);
    console.log(`ID: ${defaultClinic.id}`);
    console.log(`\nAll existing data has been associated with this clinic.`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateToMultiTenant()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
