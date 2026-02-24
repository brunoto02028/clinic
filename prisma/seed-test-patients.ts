/**
 * Seed 2 female test patients for testing the patient portal.
 * Run: npx tsx prisma/seed-test-patients.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_PATIENTS = [
  {
    email: "sarah.thompson@example.com",
    password: "Sarah@2026!",
    firstName: "Sarah",
    lastName: "Thompson",
    phone: "+44 7700 100201",
    dateOfBirth: new Date("1992-03-15"),
  },
  {
    email: "emma.wilson@example.com",
    password: "Emma@2026!",
    firstName: "Emma",
    lastName: "Wilson",
    phone: "+44 7700 100202",
    dateOfBirth: new Date("1988-07-22"),
  },
];

async function main() {
  console.log("🌱 Seeding 2 female test patients...\n");

  // Find clinic
  let clinic = await prisma.clinic.findFirst({ where: { slug: "bruno-physical-rehab" } });
  if (!clinic) {
    clinic = await prisma.clinic.findFirst();
  }
  if (!clinic) {
    throw new Error("No clinic found. Run the main seed first.");
  }
  console.log("✅ Clinic:", clinic.name);

  for (const pt of TEST_PATIENTS) {
    let user = await prisma.user.findUnique({ where: { email: pt.email } });
    if (user) {
      console.log(`⏭️  ${pt.firstName} ${pt.lastName} already exists (${pt.email})`);
      continue;
    }

    const hash = await bcrypt.hash(pt.password, 12);
    user = await prisma.user.create({
      data: {
        email: pt.email,
        password: hash,
        firstName: pt.firstName,
        lastName: pt.lastName,
        phone: pt.phone,
        role: "PATIENT",
        clinicId: clinic.id,
        isActive: true,
      },
    });

    console.log(`✅ Created: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   Password: ${pt.password}`);
  }

  console.log("\n🎉 Done! Test patient credentials:");
  console.log("─────────────────────────────────────");
  for (const pt of TEST_PATIENTS) {
    console.log(`  ${pt.firstName} ${pt.lastName}`);
    console.log(`  Email:    ${pt.email}`);
    console.log(`  Password: ${pt.password}`);
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
