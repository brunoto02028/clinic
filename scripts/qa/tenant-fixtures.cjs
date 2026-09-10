// QA fixtures for tenant isolation (activity 20) — LOCAL database only.
// Idempotent. Creates tenant A "QA Clinic A" and tenant B "QA Studio PT", each
// with staff, patients/students and records to probe isolation with, plus a
// platform SUPERADMIN. Every account is @example.test with the same password.
// Undo with scripts/qa/tenant-cleanup.cjs.
//
//   node scripts/qa/tenant-fixtures.cjs      # prints the ids as JSON
const fs = require("fs");
const path = require("path");

for (const line of fs.readFileSync(path.join(__dirname, "..", "..", ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"]+?)"?\s*$/);
  if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1];
}
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL || "")) {
  console.error("ABORT: DATABASE_URL is not a local database");
  process.exit(1);
}

const { PrismaClient, ExerciseBodyRegion } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const PASSWORD = "QaTenant#2026";

function nextMonday(hourUtc) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  const clinic = (slug, name, type = "CLINIC") =>
    prisma.clinic.upsert({
      where: { slug },
      update: { isActive: true, type },
      create: { slug, name, type },
    });

  const user = (email, role, clinicId, extra = {}) => {
    const data = {
      role,
      clinicId,
      isActive: true,
      emailVerified: new Date(),
      password: hash,
      ...(role === "PATIENT" ? { consentAcceptedAt: new Date() } : {}),
      ...extra,
    };
    return prisma.user.upsert({
      where: { email },
      update: data,
      create: { email, firstName: "QA", lastName: email.split("@")[0], ...data },
    });
  };

  const findOrCreate = async (model, where, data) =>
    (await prisma[model].findFirst({ where })) || prisma[model].create({ data });

  const clinicA = await clinic("qa-clinic-a", "QA Clinic A", "CLINIC");
  const clinicB = await clinic("qa-studio-pt", "QA Studio PT", "PERSONAL_TRAINER");

  const superadmin = await user("qa.superadmin@example.test", "SUPERADMIN", null);
  const adminA = await user("qa.admina@example.test", "ADMIN", clinicA.id);
  const fisioA = await user("qa.fisioa@example.test", "THERAPIST", clinicA.id, { bookable: true });
  const pacienteA = await user("qa.pacientea@example.test", "PATIENT", clinicA.id);
  const pacienteA2 = await user("qa.pacientea2@example.test", "PATIENT", clinicA.id);
  const trainerB = await user("qa.trainer@example.test", "ADMIN", clinicB.id, { bookable: true });
  const alunoB = await user("qa.aluno@example.test", "PATIENT", clinicB.id);
  // Second student in the SAME personal tenant — for ownership tests (a student
  // must not read/log another student's workout even within their tenant).
  const alunoB2 = await user("qa.aluno2@example.test", "PATIENT", clinicB.id);
  // Unverified account for flows that refuse active ones (send-code).
  const pendenteB = await user("qa.pendente@example.test", "PATIENT", clinicB.id, { isActive: false, emailVerified: null });

  for (const [staff, clinicId] of [[fisioA, clinicA.id], [trainerB, clinicB.id]]) {
    for (const dayOfWeek of [1, 2, 3, 4, 5]) {
      await prisma.therapistAvailability.upsert({
        where: { therapistId_dayOfWeek: { therapistId: staff.id, dayOfWeek } },
        update: { clinicId },
        create: { therapistId: staff.id, clinicId, dayOfWeek, startTime: "09:00", endTime: "17:00" },
      });
    }
  }

  const region = Object.values(ExerciseBodyRegion)[0];
  const exerciseA = await findOrCreate(
    "exercise",
    { clinicId: clinicA.id, name: "QA Clam Shell" },
    { clinicId: clinicA.id, name: "QA Clam Shell", bodyRegion: region, createdById: fisioA.id, defaultSets: 3, defaultReps: 12 }
  );
  const exerciseB = await findOrCreate(
    "exercise",
    { clinicId: clinicB.id, name: "QA Goblet Squat" },
    { clinicId: clinicB.id, name: "QA Goblet Squat", bodyRegion: region, createdById: trainerB.id, defaultSets: 3, defaultReps: 10 }
  );
  const prescriptionB = await findOrCreate(
    "exercisePrescription",
    { patientId: alunoB.id, exerciseId: exerciseB.id },
    { clinicId: clinicB.id, therapistId: trainerB.id, patientId: alunoB.id, exerciseId: exerciseB.id, sets: 3, reps: 10, frequency: "3x per week" }
  );

  const assessment = (number, clinicId, patientId, therapistId) =>
    findOrCreate("bodyAssessment", { assessmentNumber: number }, { assessmentNumber: number, clinicId, patientId, therapistId });
  const assessmentA1 = await assessment("BA-QA-A1", clinicA.id, pacienteA.id, fisioA.id);
  const assessmentA2 = await assessment("BA-QA-A2", clinicA.id, pacienteA2.id, fisioA.id);
  const assessmentB1 = await assessment("BA-QA-B1", clinicB.id, alunoB.id, trainerB.id);

  const soapNoteA = await findOrCreate(
    "sOAPNote",
    { patientId: pacienteA.id, subjective: "QA fixture" },
    { clinicId: clinicA.id, patientId: pacienteA.id, therapistId: fisioA.id, subjective: "QA fixture", objective: "QA fixture", assessment: "QA fixture", plan: "QA fixture" }
  );
  const screeningA = await prisma.medicalScreening.upsert({
    where: { userId: pacienteA.id },
    update: {},
    create: { userId: pacienteA.id, clinicId: clinicA.id },
  });

  // Unlike the other records, appointments are refreshed on every run: a
  // reused one would keep the first run's date and drift into the past.
  const appointment = async (treatmentType, clinicId, patientId, therapistId, hour) => {
    const data = { treatmentType, clinicId, patientId, therapistId, dateTime: nextMonday(hour), duration: 60, status: "CONFIRMED" };
    const existing = await prisma.appointment.findFirst({ where: { treatmentType, patientId } });
    return existing
      ? prisma.appointment.update({ where: { id: existing.id }, data })
      : prisma.appointment.create({ data });
  };
  const appointmentA = await appointment("QA fixture A", clinicA.id, pacienteA.id, fisioA.id, 9);
  const appointmentB = await appointment("QA fixture B", clinicB.id, alunoB.id, trainerB.id, 10);

  console.log(JSON.stringify({
    password: PASSWORD,
    clinicA: clinicA.id,
    clinicB: clinicB.id,
    users: {
      superadmin: superadmin.id, adminA: adminA.id, fisioA: fisioA.id, pacienteA: pacienteA.id,
      pacienteA2: pacienteA2.id, trainerB: trainerB.id, alunoB: alunoB.id, pendenteB: pendenteB.id,
    },
    records: {
      exerciseA: exerciseA.id, exerciseB: exerciseB.id, prescriptionB: prescriptionB.id,
      assessmentA1: assessmentA1.id, assessmentA2: assessmentA2.id, assessmentB1: assessmentB1.id,
      soapNoteA: soapNoteA.id, screeningA: screeningA.id,
      appointmentA: appointmentA.id, appointmentB: appointmentB.id,
    },
  }, null, 2));
}

main()
  .catch((err) => {
    console.error("FIXTURES FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
