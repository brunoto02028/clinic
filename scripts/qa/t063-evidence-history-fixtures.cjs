// QA fixtures for activity 063, T-1 (evidence report history / ?history=true).
// LOCAL database only. Reuses clinic A / clinic B from tenant-fixtures.cjs
// (qa.admina, qa.fisioa, qa.trainer, qa.pacientea) so cross-tenant checks
// reuse an already-known-good pair of tenants instead of new ones.
//
// Adds to clinic A ("qa-clinic-a"):
//  - qa.pacientea (existing): 3 ClinicalEvidenceReport rows, spaced
//    createdAt, statuses ARCHIVED (oldest) / DRAFT (middle) / APPROVED
//    (newest) -> multi-report history + PATCH-on-non-latest scenarios.
//  - a new patient qa.evidence.onereport: exactly 1 report -> no-regression
//    (single-report) scenario.
//  - a new patient qa.evidence.noreport: 0 reports -> empty-state scenario.
//
// Cross-tenant probe: qa.trainer (clinic B staff) hitting qa.pacientea's
// (clinic A) history should 404, same as today.
//
//   node scripts/qa/t063-evidence-history-fixtures.cjs
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

  const pacienteA = await prisma.user.upsert({
    where: { email: "qa.pacientea@example.test" },
    update: { role: "PATIENT", clinicId: clinicA.id, isActive: true, emailVerified: new Date(), password: hash, consentAcceptedAt: new Date() },
    create: {
      email: "qa.pacientea@example.test", firstName: "QA", lastName: "pacientea",
      role: "PATIENT", clinicId: clinicA.id, isActive: true, emailVerified: new Date(), password: hash,
      consentAcceptedAt: new Date(),
    },
  });

  const makePatient = async (slug) => {
    const email = `qa.evidence.${slug}@example.test`;
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
  const pOneReport = await makePatient("onereport");
  const pNoReport = await makePatient("noreport");

  // Filtered by patientId only (not clinicId): a reused email from an earlier,
  // unrelated fixture run can carry reports stamped with a stale clinicId, and
  // those must be wiped too or the "no report"/"one report" scenarios lie.
  const resetReports = async (patientId) => prisma.clinicalEvidenceReport.deleteMany({ where: { patientId } });

  // --- qa.pacientea: 3 reports, spaced, mixed statuses ---
  await resetReports(pacienteA.id);
  const rArchived = await prisma.clinicalEvidenceReport.create({
    data: {
      clinicId: clinicA.id, patientId: pacienteA.id, status: "ARCHIVED",
      createdAt: daysAgo(20),
      caseSummary: { chiefComplaint: "Right shoulder pain on overhead reach", location: "Right shoulder", duration: "3 weeks", scores: { vas: 6, faamAdl: 70, faamSport: 40, function: 65 } },
      narrativeEn: "QA fixture: oldest report in the history, superseded by later triage data. Status ARCHIVED.",
    },
  });
  const rDraft = await prisma.clinicalEvidenceReport.create({
    data: {
      clinicId: clinicA.id, patientId: pacienteA.id, status: "DRAFT",
      createdAt: daysAgo(10),
      caseSummary: { chiefComplaint: "Right shoulder pain, now with night pain", location: "Right shoulder", duration: "5 weeks", scores: { vas: 7, faamAdl: 60, faamSport: 30, function: 55 } },
      narrativeEn: "QA fixture: middle report in the history, re-generated after follow-up triage. Status DRAFT.",
    },
  });
  const rApproved = await prisma.clinicalEvidenceReport.create({
    data: {
      clinicId: clinicA.id, patientId: pacienteA.id, status: "APPROVED", approvedAt: daysAgo(1),
      createdAt: daysAgo(1),
      caseSummary: { chiefComplaint: "Right shoulder pain, improving with PT", location: "Right shoulder", duration: "7 weeks", scores: { vas: 3, faamAdl: 85, faamSport: 60, function: 80 } },
      narrativeEn: "QA fixture: most recent report in the history, already reviewed. Status APPROVED.",
    },
  });

  // --- qa.evidence.onereport: exactly 1 report ---
  await resetReports(pOneReport.id);
  const rSingle = await prisma.clinicalEvidenceReport.create({
    data: {
      clinicId: clinicA.id, patientId: pOneReport.id, status: "DRAFT",
      caseSummary: { chiefComplaint: "Low back pain after lifting", location: "Lumbar spine", duration: "1 week", scores: { vas: 5, faamAdl: 75, faamSport: 50, function: 70 } },
      narrativeEn: "QA fixture: only report this patient has — single-report / no-regression scenario.",
    },
  });

  // --- qa.evidence.noreport: 0 reports (already guaranteed by resetReports) ---
  await resetReports(pNoReport.id);

  console.log(JSON.stringify({
    password: PASSWORD,
    clinicA: clinicA.id,
    pacienteA: { id: pacienteA.id, email: pacienteA.email, reports: { archived: rArchived.id, draft: rDraft.id, approved: rApproved.id } },
    onereport: { id: pOneReport.id, email: pOneReport.email, reportId: rSingle.id },
    noreport: { id: pNoReport.id, email: pNoReport.email },
  }, null, 2));
}

main()
  .catch((err) => {
    console.error("FIXTURES FAILED:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
