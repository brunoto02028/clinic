// Removes everything scripts/qa/tenant-fixtures.cjs (or a QA run on top of
// it) created — LOCAL database only. Only touches @example.test accounts whose
// address starts with "qa.", their records, and the two QA tenants.
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
const QA_SLUGS = ["qa-clinic-a", "qa-studio-pt"];

async function step(label, fn) {
  try {
    const result = await fn();
    console.log(`${label}: ${result?.count ?? "ok"}`);
  } catch (err) {
    console.log(`${label}: ERROR ${err.message.split("\n").pop()}`);
    process.exitCode = 1;
  }
}

async function main() {
  const clinics = await prisma.clinic.findMany({ where: { slug: { in: QA_SLUGS } }, select: { id: true } });
  const clinicIds = clinics.map((c) => c.id);
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "qa.", endsWith: "@example.test" } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  const byUser = (a, b) => ({ OR: [{ [a]: { in: ids } }, ...(b ? [{ [b]: { in: ids } }] : []), { clinicId: { in: clinicIds } }] });

  await step("bodyAssessments", () => prisma.bodyAssessment.deleteMany({ where: byUser("patientId", "therapistId") }));
  await step("soapNotes", () => prisma.sOAPNote.deleteMany({ where: byUser("patientId", "therapistId") }));
  await step("medicalScreenings", () => prisma.medicalScreening.deleteMany({ where: { userId: { in: ids } } }));
  await step("appointments", () => prisma.appointment.deleteMany({ where: byUser("patientId", "therapistId") }));
  await step("prescriptions", () => prisma.exercisePrescription.deleteMany({ where: byUser("patientId", "therapistId") }));
  await step("exercises", () => prisma.exercise.deleteMany({ where: { OR: [{ createdById: { in: ids } }, { clinicId: { in: clinicIds } }] } }));
  await step("availability", () => prisma.therapistAvailability.deleteMany({ where: { therapistId: { in: ids } } }));
  await step("refreshTokens", () => prisma.mobileRefreshToken.deleteMany({ where: { userId: { in: ids } } }));
  // Mail logs and tokens are keyed by address and outlive the user row.
  const qaAddress = { startsWith: "qa.", endsWith: "@example.test" };
  await step("emailMessages", () => prisma.emailMessage.deleteMany({ where: { OR: [{ toAddress: qaAddress }, { patientId: { in: ids } }] } }));
  await step("passwordResetTokens", () => prisma.passwordResetToken.deleteMany({ where: { email: qaAddress } }));
  await step("verificationCodes", () => prisma.verificationCode.deleteMany({ where: { userId: { in: ids } } }));
  // Workouts before users: Workout.trainer is RESTRICT (like ExercisePrescription.therapist),
  // so a trainer with workouts can't be deleted until the workouts are gone.
  // Deleting the workout cascades its exercises, logs and set-logs.
  await step("workoutLogs", () => prisma.workoutLog.deleteMany({ where: { OR: [{ studentId: { in: ids } }, { clinicId: { in: clinicIds } }] } }));
  await step("workouts", () => prisma.workout.deleteMany({ where: { OR: [{ studentId: { in: ids } }, { trainerId: { in: ids } }, { clinicId: { in: clinicIds } }] } }));
  await step("users", () => prisma.user.deleteMany({ where: { id: { in: ids } } }));
  await step("clinics", () => prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } }));

  const left =
    (await prisma.user.count({ where: { email: { startsWith: "qa.", endsWith: "@example.test" } } })) +
    (await prisma.clinic.count({ where: { slug: { in: QA_SLUGS } } }));
  console.log(`leftover fixtures: ${left}`);
  if (left) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
