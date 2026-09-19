// QA fixtures for activity 063, T-2 (weekly check-in "due" logic).
// LOCAL database only. Reuses clinic A from tenant-fixtures.cjs (qa-clinic-a).
//
// Creates 4 patients:
//  - qa.checkin.duenorecord     — no PatientOutcomeMeasure, User.createdAt 8 days ago -> due: true
//  - qa.checkin.notduerecent    — no PatientOutcomeMeasure, User.createdAt 2 days ago -> due: false
//  - qa.checkin.dueoldrecord    — 1 PatientOutcomeMeasure, recordedAt 10 days ago -> due: true
//  - qa.checkin.notduerecord    — 1 PatientOutcomeMeasure, recordedAt 1 day ago -> due: false
//
//   node scripts/qa/t063-checkin-due-fixtures.cjs
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
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const PASSWORD = "QaTenant#2026"; // same password tenant-fixtures.cjs uses

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  const clinicA = await prisma.clinic.upsert({
    where: { slug: "qa-clinic-a" },
    update: { isActive: true },
    create: { slug: "qa-clinic-a", name: "QA Clinic A", type: "CLINIC" },
  });

  const makePatient = async (slug) => {
    const email = `qa.checkin.${slug}@example.test`;
    return prisma.user.upsert({
      where: { email },
      update: { role: "PATIENT", clinicId: clinicA.id, isActive: true, emailVerified: new Date(), password: hash, consentAcceptedAt: new Date() },
      create: {
        email, firstName: "QA", lastName: slug,
        role: "PATIENT", clinicId: clinicA.id, isActive: true, emailVerified: new Date(), password: hash,
        consentAcceptedAt: new Date(), dateOfBirth: new Date("1992-05-01"),
      },
    });
  };

  const resetMeasures = async (patientId) => prisma.patientOutcomeMeasure.deleteMany({ where: { patientId } });

  // --- qa.checkin.duenorecord: no measures, createdAt 8 days ago -> due: true ---
  const pDueNoRecord = await makePatient("duenorecord");
  await resetMeasures(pDueNoRecord.id);
  await prisma.user.update({ where: { id: pDueNoRecord.id }, data: { createdAt: daysAgo(8) } });

  // --- qa.checkin.notduerecent: no measures, createdAt 2 days ago -> due: false ---
  const pNotDueRecent = await makePatient("notduerecent");
  await resetMeasures(pNotDueRecent.id);
  await prisma.user.update({ where: { id: pNotDueRecent.id }, data: { createdAt: daysAgo(2) } });

  // --- qa.checkin.dueoldrecord: 1 measure, recordedAt 10 days ago -> due: true ---
  const pDueOldRecord = await makePatient("dueoldrecord");
  await resetMeasures(pDueOldRecord.id);
  await prisma.user.update({ where: { id: pDueOldRecord.id }, data: { createdAt: daysAgo(30) } });
  const mOld = await prisma.patientOutcomeMeasure.create({
    data: {
      patientId: pDueOldRecord.id, clinicId: clinicA.id,
      vasScore: 4, faamAdl: 70, faamSport: 50, faamAdlPercent: 70, faamSportPercent: 50, overallFunction: 65,
      recordedAt: daysAgo(10),
    },
  });

  // --- qa.checkin.notduerecord: 1 measure, recordedAt 1 day ago -> due: false ---
  const pNotDueRecord = await makePatient("notduerecord");
  await resetMeasures(pNotDueRecord.id);
  await prisma.user.update({ where: { id: pNotDueRecord.id }, data: { createdAt: daysAgo(30) } });
  const mRecent = await prisma.patientOutcomeMeasure.create({
    data: {
      patientId: pNotDueRecord.id, clinicId: clinicA.id,
      vasScore: 2, faamAdl: 85, faamSport: 70, faamAdlPercent: 85, faamSportPercent: 70, overallFunction: 80,
      recordedAt: daysAgo(1),
    },
  });

  console.log(JSON.stringify({
    password: PASSWORD,
    clinicA: clinicA.id,
    dueNoRecord: { id: pDueNoRecord.id, email: pDueNoRecord.email },
    notDueRecent: { id: pNotDueRecent.id, email: pNotDueRecent.email },
    dueOldRecord: { id: pDueOldRecord.id, email: pDueOldRecord.email, measureId: mOld.id },
    notDueRecord: { id: pNotDueRecord.id, email: pNotDueRecord.email, measureId: mRecent.id },
  }, null, 2));
}

main()
  .catch((err) => {
    console.error("FIXTURES FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
