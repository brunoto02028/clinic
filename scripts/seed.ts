import { PrismaClient, UserRole, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Step 1: Create the default clinic
  console.log("Creating default clinic...");
  
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
  
  console.log(`Clinic created: ${defaultClinic.name} (ID: ${defaultClinic.id})`);

  // Step 2: Create subscription for the clinic
  console.log("Creating subscription...");
  
  await prisma.subscription.upsert({
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
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Step 3: Create Bruno admin user
  const brunoPassword = await bcrypt.hash("Bruno@Admin2026!", 12);
  
  const admin = await prisma.user.upsert({
    where: { email: "admin@bpr.rehab" },
    update: {
      password: brunoPassword,
      role: UserRole.ADMIN,
      isActive: true,
      clinicId: defaultClinic.id,
      canManageUsers: true,
      canManageAppointments: true,
      canManageArticles: true,
      canManageSettings: true,
      canViewAllPatients: true,
      canCreateClinicalNotes: true,
      canManageFootScans: true,
      canManageOrders: true,
    },
    create: {
      email: "admin@bpr.rehab",
      password: brunoPassword,
      firstName: "Bruno",
      lastName: "Admin",
      phone: "07700 900000",
      role: UserRole.ADMIN,
      isActive: true,
      clinicId: defaultClinic.id,
      canManageUsers: true,
      canManageAppointments: true,
      canManageArticles: true,
      canManageSettings: true,
      canViewAllPatients: true,
      canCreateClinicalNotes: true,
      canManageFootScans: true,
      canManageOrders: true,
    },
  });

  console.log("Created admin user:", admin.email);

  // Step 4: Create default therapist availability (Monday-Saturday, 9am-5pm)
  const daysOfWeek = [1, 2, 3, 4, 5, 6]; // Monday to Saturday
  
  for (const dayOfWeek of daysOfWeek) {
    await prisma.therapistAvailability.upsert({
      where: {
        therapistId_dayOfWeek: {
          therapistId: admin.id,
          dayOfWeek,
        },
      },
      update: {
        clinicId: defaultClinic.id,
      },
      create: {
        therapistId: admin.id,
        clinicId: defaultClinic.id,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: true,
      },
    });
  }

  console.log("Created therapist availability");
  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
