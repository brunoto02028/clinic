// QA fixtures for activity 118, T-7 (as metas são do paciente).
// LOCAL database only — aborts otherwise.
//
// Three patients in clinic A ("qa-clinic-a", from tenant-fixtures.cjs), all
// with the same password, each standing for one thing the QA has to tell apart:
//
//  - qa.metas.dono@example.test     — full access, **no goals**: the initial
//    state has to be genuinely empty, because "nothing is pre-filled" is the
//    first thing to check and a leftover row would hide a failure.
//  - qa.metas.vizinho@example.test  — full access, goals of its own: proves
//    one patient's goals are not the other's.
//  - qa.metas.semplano@example.test — `mod_devices` revoked: proves the route
//    refuses with `module_not_in_plan` instead of serving the goals.
//
//   node scripts/qa/t118-metas-fixtures.cjs
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
const PASSWORD = "QaTenant#2026"; // the same one tenant-fixtures.cjs uses

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);

  const clinic = await prisma.clinic.upsert({
    where: { slug: "qa-clinic-a" },
    update: { isActive: true },
    create: { slug: "qa-clinic-a", name: "QA Clinic A", type: "CLINIC" },
  });

  const paciente = async (slug, extra) => {
    const email = `qa.metas.${slug}@example.test`;
    const comum = {
      role: "PATIENT",
      clinicId: clinic.id,
      isActive: true,
      emailVerified: new Date(),
      password: hash,
      // Sem isto o portão responde `consent_required` e nenhum cenário de
      // metas chega a correr — a recusa certa, mas da pergunta errada.
      consentAcceptedAt: new Date(),
      ...extra,
    };
    return prisma.user.upsert({
      where: { email },
      update: comum,
      create: { email, firstName: "QA", lastName: `metas-${slug}`, ...comum },
    });
  };

  const dono = await paciente("dono", { fullAccessOverride: true, moduleOverrides: {} });
  const vizinho = await paciente("vizinho", { fullAccessOverride: true, moduleOverrides: {} });
  const semplano = await paciente("semplano", {
    fullAccessOverride: false,
    moduleOverrides: { mod_devices: false },
  });

  // O dono começa **sem metas nenhumas**. Apagar é parte da fixture: uma linha
  // deixada por uma rodada anterior faria o primeiro cenário passar por engano.
  await prisma.patientGoals.deleteMany({ where: { userId: dono.id } });

  await prisma.patientGoals.upsert({
    where: { userId: vizinho.id },
    update: { steps: 12345, activeMinutes: 45, sleepMinutes: 480, activeCalories: 600 },
    create: { userId: vizinho.id, steps: 12345, activeMinutes: 45, sleepMinutes: 480, activeCalories: 600 },
  });

  console.log("clinic:", clinic.slug, clinic.id);
  console.log("senha de todos:", PASSWORD);
  console.log("dono     (acesso, sem metas):   qa.metas.dono@example.test     ", dono.id);
  console.log("vizinho  (acesso, com metas):   qa.metas.vizinho@example.test  ", vizinho.id);
  console.log("semplano (mod_devices negado):  qa.metas.semplano@example.test ", semplano.id);
  console.log("metas do vizinho:", await prisma.patientGoals.findUnique({ where: { userId: vizinho.id } }));
  console.log("metas do dono:", await prisma.patientGoals.findUnique({ where: { userId: dono.id } }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
