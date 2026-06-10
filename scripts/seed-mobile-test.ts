/**
 * Minimal seed for the local mobile QA environment.
 * Creates a clinic, a PATIENT (known credentials), a THERAPIST, sample
 * appointments and a prescribed exercise — idempotently.
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
  console.log("Clinic:", clinic.name);

  const hash = await bcrypt.hash(PATIENT.password, 12);
  const patient = await prisma.user.upsert({
    where: { email: PATIENT.email },
    update: {},
    create: {
      email: PATIENT.email,
      password: hash,
      firstName: PATIENT.firstName,
      lastName: PATIENT.lastName,
      role: "PATIENT",
      clinicId: clinic.id,
      isActive: true,
      phone: "+44 7700 100201",
    },
  });
  console.log("Patient:", patient.email);

  const therapist = await prisma.user.upsert({
    where: { email: "james.carter@example.com" },
    update: {},
    create: {
      email: "james.carter@example.com",
      firstName: "James",
      lastName: "Carter",
      role: "THERAPIST",
      clinicId: clinic.id,
      isActive: true,
    },
  });
  console.log("Therapist:", therapist.email);

  // Appointments (one upcoming, one past) — only if the patient has none.
  const apptCount = await prisma.appointment.count({ where: { patientId: patient.id } });
  if (apptCount === 0) {
    const day = 24 * 60 * 60 * 1000;
    await prisma.appointment.createMany({
      data: [
        {
          clinicId: clinic.id,
          patientId: patient.id,
          therapistId: therapist.id,
          dateTime: new Date(Date.now() + 3 * day),
          treatmentType: "Physiotherapy",
          status: "CONFIRMED",
          duration: 60,
          price: 60,
        },
        {
          clinicId: clinic.id,
          patientId: patient.id,
          therapistId: therapist.id,
          dateTime: new Date(Date.now() - 10 * day),
          treatmentType: "Initial Assessment",
          status: "COMPLETED",
          duration: 45,
          price: 80,
        },
      ],
    });
    console.log("Created 2 appointments");
  } else {
    console.log("Appointments already exist:", apptCount);
  }

  // Exercise + prescription — only if the patient has no active prescription.
  const rxCount = await prisma.exercisePrescription.count({
    where: { patientId: patient.id },
  });
  if (rxCount === 0) {
    const exercise = await prisma.exercise.create({
      data: {
        clinicId: clinic.id,
        name: "Calf Raises",
        description: "Strengthens the calf muscles and improves ankle stability.",
        instructions: "Stand tall, raise your heels off the floor, hold, then lower slowly.",
        bodyRegion: "ANKLE_FOOT",
        difficulty: "BEGINNER",
        defaultSets: 3,
        defaultReps: 12,
        createdById: therapist.id,
      } as any,
    });
    await prisma.exercisePrescription.create({
      data: {
        clinicId: clinic.id,
        therapistId: therapist.id,
        patientId: patient.id,
        exerciseId: exercise.id,
        sets: 3,
        reps: 12,
        frequency: "Daily",
        notes: "Do these every morning before activity.",
        isActive: true,
      },
    });
    console.log("Created exercise + prescription");
  } else {
    console.log("Prescriptions already exist:", rxCount);
  }

  // Blood pressure reading
  if ((await prisma.bloodPressureReading.count({ where: { patientId: patient.id } })) === 0) {
    await prisma.bloodPressureReading.create({
      data: { patientId: patient.id, clinicId: clinic.id, systolic: 122, diastolic: 78, heartRate: 70 },
    });
    console.log("Created BP reading");
  }

  // Patient task
  if ((await prisma.patientTask.count({ where: { patientId: patient.id } })) === 0) {
    await prisma.patientTask.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        createdById: therapist.id,
        type: "UPDATE_PROFILE",
        title: "Complete your profile",
        titlePt: "Complete seu perfil",
        priority: "high",
        status: "pending",
      },
    });
    console.log("Created task");
  }

  // Patient document
  if ((await prisma.patientDocument.count({ where: { patientId: patient.id } })) === 0) {
    await prisma.patientDocument.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        uploadedById: therapist.id,
        fileName: "referral-letter.pdf",
        fileUrl: "https://bpr.rehab/uploads/sample-referral.pdf",
        fileType: "application/pdf",
        title: "Carta de encaminhamento",
      },
    });
    console.log("Created document");
  }

  // Education content (published)
  if ((await prisma.educationContent.count({ where: { clinicId: clinic.id } })) === 0) {
    await prisma.educationContent.create({
      data: {
        clinicId: clinic.id,
        createdById: therapist.id,
        title: "Cuidando do seu tornozelo",
        description: "Dicas para prevenir lesões e fortalecer a articulação.",
        contentType: "article",
        body: "Mantenha os exercícios prescritos, use calçado adequado e evite sobrecarga.",
        isPublished: true,
      },
    });
    console.log("Created education content");
  }

  // Membership plans (clinic-wide)
  if ((await prisma.membershipPlan.count({ where: { clinicId: clinic.id } })) === 0) {
    await prisma.membershipPlan.createMany({
      data: [
        { clinicId: clinic.id, name: "Plano Mensal", description: "Acesso completo, cobrança mensal.", price: 60, interval: "MONTHLY", isFree: false, patientScope: "all", status: "ACTIVE" },
        { clinicId: clinic.id, name: "Plano Anual", description: "Acesso completo, cobrança anual com desconto.", price: 600, interval: "YEARLY", isFree: false, patientScope: "all", status: "ACTIVE" },
      ] as any,
    });
    console.log("Created membership plans");
  }

  // Foot scan with measurements (for the native 3D viewer)
  if ((await prisma.footScan.count({ where: { patientId: patient.id } })) === 0) {
    await prisma.footScan.create({
      data: {
        scanNumber: "FS-2026-00001",
        clinicId: clinic.id,
        patientId: patient.id,
        status: "APPROVED",
        leftFootLength: 260,
        rightFootLength: 262,
        leftFootWidth: 98,
        rightFootWidth: 99,
        leftArchHeight: 25,
        rightArchHeight: 23,
        archType: "Normal",
        pronation: "Neutral",
        halluxValgusAngle: 12.5,
      } as any,
    });
    console.log("Created foot scan");
  }

  console.log(`\nTest login → ${PATIENT.email} / ${PATIENT.password}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
