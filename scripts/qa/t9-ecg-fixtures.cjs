// QA fixtures for activity 099, T-9 (o traçado do ECG e o PDF). TEMPORÁRIO.
// LOCAL database only — aborts otherwise.
//
// Dois pacientes na mesma clínica, para poder cruzar:
//   qa.ecg.a@example.test — gravação COM traçado (onda quadrada de 1000 µV)
//                           e uma segunda gravação SEM traçado
//   qa.ecg.b@example.test — gravação própria, para o cruzamento
//
//   node scripts/qa/t9-ecg-fixtures.cjs
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
const PASSWORD = "QaTenant#2026";

/** 1000 µV na primeira meia de cada segundo, 0 na segunda. 300 Hz, 30 s. */
const quadrada = Array.from({ length: 9000 }, (_, i) => ((i % 300) < 150 ? 1000 : 0));

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 12);
  const clinic = await prisma.clinic.upsert({
    where: { slug: "qa-clinic-a" },
    update: { isActive: true },
    create: { slug: "qa-clinic-a", name: "QA Clinic A", type: "CLINIC" },
  });

  const paciente = async (slug, extra = {}) => {
    const email = `qa.ecg.${slug}@example.test`;
    const comum = {
      role: "PATIENT",
      clinicId: clinic.id,
      isActive: true,
      emailVerified: new Date(),
      password: hash,
      consentAcceptedAt: new Date(),
      fullAccessOverride: true,
      moduleOverrides: {},
      dateOfBirth: new Date("1980-01-15T00:00:00Z"),
      ...extra,
    };
    return prisma.user.upsert({
      where: { email },
      update: comum,
      create: { email, firstName: "QA", lastName: `ecg-${slug}`, ...comum },
    });
  };

  const a = await paciente("a");
  const b = await paciente("b");
  const semplano = await paciente("semplano", {
    fullAccessOverride: false,
    moduleOverrides: { mod_devices: false },
  });

  await prisma.ecgRecording.deleteMany({ where: { userId: { in: [a.id, b.id, semplano.id] } } });

  const grav = (userId, recordedAt, d) =>
    prisma.ecgRecording.create({
      data: {
        userId,
        provider: "withings",
        recordedAt: new Date(recordedAt),
        conclusao: "normal",
        afibRaw: 0,
        heartRate: 63,
        ...d,
      },
      select: { id: true },
    });

  const aCom = await grav(a.id, "2026-10-01T22:54:15Z", {
    signal: quadrada,
    samplingHz: 300,
    wearPosition: 1,
    signalId: "qa-signal-1",
  });
  const aSem = await grav(a.id, "2026-10-01T21:44:56Z", { signalId: "qa-signal-2" });
  const bCom = await grav(b.id, "2026-10-01T20:10:00Z", {
    signal: quadrada.slice(0, 3000),
    samplingHz: 300,
    wearPosition: 1,
  });
  const spCom = await grav(semplano.id, "2026-10-01T19:00:00Z", {
    signal: quadrada.slice(0, 3000),
    samplingHz: 300,
  });

  console.log(
    JSON.stringify(
      {
        senha: PASSWORD,
        A: { email: `qa.ecg.a@example.test`, userId: a.id, comTracado: aCom.id, semTracado: aSem.id },
        B: { email: `qa.ecg.b@example.test`, userId: b.id, gravacao: bCom.id },
        SEMPLANO: { email: `qa.ecg.semplano@example.test`, userId: semplano.id, gravacao: spCom.id },
      },
      null,
      2
    )
  );
  await prisma.$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
