/**
 * Minimal seed for the local mobile-auth QA environment.
 * Creates one clinic + one PATIENT with known credentials, idempotently.
 * Run against the TEST database only:
 *   DATABASE_URL=postgresql://localhost:5432/clinic_test npx tsx scripts/seed-mobile-test.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PATIENT = {
  email: "sarah.thompson@example.com",
  password: "Sarah@2026!",
  firstName: "Sarah",
  lastName: "Thompson",
};

async function main() {
  const clinic =
    (await prisma.clinic.findFirst({ where: { slug: "bruno-physical-rehab" } })) ??
    (await prisma.clinic.create({
      data: { name: "Bruno Physical Rehab", slug: "bruno-physical-rehab" },
    }));
  console.log("Clinic:", clinic.name, clinic.id);

  const existing = await prisma.user.findUnique({ where: { email: PATIENT.email } });
  if (existing) {
    console.log("Patient already exists:", existing.email);
  } else {
    const hash = await bcrypt.hash(PATIENT.password, 12);
    const user = await prisma.user.create({
      data: {
        email: PATIENT.email,
        password: hash,
        firstName: PATIENT.firstName,
        lastName: PATIENT.lastName,
        role: "PATIENT",
        clinicId: clinic.id,
        isActive: true,
      },
    });
    console.log("Created patient:", user.email);
  }

  console.log(`\nTest login → ${PATIENT.email} / ${PATIENT.password}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
