// QA fixtures for the "impersonation bypasses getEffectiveUser" bug fix
// (2026-09-19). Adds patient-scoped rows for qa.pacientea@example.test (QA
// Clinic A) so the 7 fixed routes have real data to distinguish "patient's
// data" from "empty/staff data" during impersonation. LOCAL database only.
// Run scripts/qa/tenant-fixtures.cjs first.
//
//   node scripts/qa/impersonation-fix-fixtures.cjs
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

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function isoDate(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function nextTuesday(hourUtc) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((9 - d.getUTCDay()) % 7 || 7));
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

async function main() {
  const clinicA = await prisma.clinic.findUniqueOrThrow({ where: { slug: "qa-clinic-a" } });
  const pacienteA = await prisma.user.findUniqueOrThrow({ where: { email: "qa.pacientea@example.test" } });
  const fisioA = await prisma.user.findUniqueOrThrow({ where: { email: "qa.fisioa@example.test" } });
  const adminA = await prisma.user.findUniqueOrThrow({ where: { email: "qa.admina@example.test" } });

  // DailyCheckIn — distinctive pain/mood so we can tell it's THIS patient's data.
  for (let i = 0; i < 3; i++) {
    await prisma.dailyCheckIn.upsert({
      where: { patientId_checkinDate: { patientId: pacienteA.id, checkinDate: isoDate(i) } },
      update: { painLevel: 7, moodLevel: 2, exercisesDone: true },
      create: {
        clinicId: clinicA.id,
        patientId: pacienteA.id,
        checkinDate: isoDate(i),
        painLevel: 7,
        moodLevel: 2,
        exercisesDone: true,
        notes: "QA fixture — impersonation-fix",
      },
    });
  }

  // PatientOutcomeMeasure — distinctive VAS score.
  const existingOutcome = await prisma.patientOutcomeMeasure.findFirst({
    where: { patientId: pacienteA.id, vasScore: 9 },
  });
  const outcome = existingOutcome || (await prisma.patientOutcomeMeasure.create({
    data: {
      patientId: pacienteA.id,
      clinicId: clinicA.id,
      vasScore: 9,
      faamAdl: 60,
      faamSport: 40,
      faamAdlPercent: 60,
      faamSportPercent: 40,
      overallFunction: 5,
    },
  }));

  // RehabPlan — sent to patient.
  const existingPlan = await prisma.rehabPlan.findFirst({ where: { patientId: pacienteA.id } });
  const rehabPlan = existingPlan || (await prisma.rehabPlan.create({
    data: {
      patientId: pacienteA.id,
      createdById: fisioA.id,
      chiefComplaint: "QA fixture — knee pain",
      bodyPart: "knee",
      severity: "moderate",
      phase: "subacute",
      planJson: { phases: [{ name: "QA fixture phase", exercises: [] }] },
      status: "active",
      sentToPatient: true,
      sentAt: new Date(),
    },
  }));

  // Appointment pending patient confirmation — distinct from the CONFIRMED
  // appointmentA created by tenant-fixtures.cjs.
  const existingPending = await prisma.appointment.findFirst({
    where: { patientId: pacienteA.id, treatmentType: "QA fixture pending confirm" },
  });
  const pendingAppointment = existingPending
    ? await prisma.appointment.update({
        where: { id: existingPending.id },
        data: { status: "PENDING_PATIENT", dateTime: nextTuesday(11) },
      })
    : await prisma.appointment.create({
        data: {
          treatmentType: "QA fixture pending confirm",
          clinicId: clinicA.id,
          patientId: pacienteA.id,
          therapistId: fisioA.id,
          dateTime: nextTuesday(11),
          duration: 60,
          status: "PENDING_PATIENT",
        },
      });

  // ConsultationRecording — existing row so GET has something to list.
  const existingRecording = await prisma.consultationRecording.findFirst({
    where: { patientId: pacienteA.id },
  });
  const recording = existingRecording || (await prisma.consultationRecording.create({
    data: {
      patientId: pacienteA.id,
      clinicId: clinicA.id,
      audioUrl: "data:audio/webm;base64,QA_FIXTURE",
      duration: 5,
      language: "pt",
      status: "pending",
    },
  }));

  console.log(JSON.stringify({
    clinicA: clinicA.id,
    pacienteA: pacienteA.id,
    adminA: adminA.id,
    fisioA: fisioA.id,
    records: {
      outcomeId: outcome.id,
      rehabPlanId: rehabPlan.id,
      pendingAppointmentId: pendingAppointment.id,
      recordingId: recording.id,
    },
  }, null, 2));
}

main()
  .catch((err) => {
    console.error("FIXTURES FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
