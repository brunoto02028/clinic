// Activity 38 T-2: Appointment.clinicId is becoming a required column. Any
// row still null when the schema push runs would fail that migration (or
// worse, get silently coerced), so this backfill has to run BEFORE
// `db push` picks up the new schema — see the placement of this script's
// call in start.sh, ahead of the "Syncing database schema" step, unlike
// every other maintenance script here which runs after it.
//
// Resolution order per Suposição 3 of specs/38-fechamento-gaps-personal:
// the PATIENT's own clinicId first (an appointment belongs to the clinic
// that owns the patient's care, not necessarily the therapist's — relevant
// once a therapist can work across tenants), then the platform's default
// tenant, then — only here, never for a live booking — the oldest active
// clinic as a last resort. Production currently has more than one active
// clinic with no DEFAULT_CLINIC_SLUG set, so getDefaultClinicId() alone
// returns null there; leaving a row like that permanently unresolved would
// make the NOT NULL constraint below fail forever with no clear signal
// (Postgres refuses the whole column, not just the bad rows). A best-effort
// guess for a handful of pre-existing historical rows is an acceptable
// trade a live transaction should not make — see the webhook's own
// appointmentClinicId resolution, which stops at the default tenant and
// refuses the booking instead of guessing.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDefaultClinicId() {
  const slug = process.env.DEFAULT_CLINIC_SLUG;
  if (slug) {
    const clinic = await prisma.clinic.findUnique({ where: { slug }, select: { id: true, isActive: true } });
    return clinic?.isActive ? clinic.id : null;
  }
  const active = await prisma.clinic.findMany({ where: { isActive: true }, select: { id: true }, take: 2 });
  return active.length === 1 ? active[0].id : null;
}

async function getOldestActiveClinicId() {
  const clinic = await prisma.clinic.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return clinic?.id || null;
}

async function main() {
  // Raw SQL, deliberately: this script runs (see start.sh) BEFORE `db push`
  // applies the NOT NULL constraint, but the Prisma Client bundled in this
  // image is already generated from the schema that declares clinicId
  // required — its typed `findMany({ where: { clinicId: null } })` throws
  // "Argument `clinicId` must not be null" even though the live column is
  // still nullable at this point in boot. Raw SQL bypasses that client-side
  // validation and asks the database directly, which is what actually
  // matters here.
  const orphanRows = await prisma.$queryRaw`SELECT id, "patientId" FROM "Appointment" WHERE "clinicId" IS NULL`;

  if (orphanRows.length === 0) {
    console.log('[backfill-appointment-clinicid] No orphaned appointments — nothing to do.');
    return;
  }

  const patients = await prisma.user.findMany({
    where: { id: { in: orphanRows.map((r) => r.patientId) } },
    select: { id: true, clinicId: true },
  });
  const patientClinicById = new Map(patients.map((p) => [p.id, p.clinicId]));
  const orphans = orphanRows.map((r) => ({ id: r.id, patient: { clinicId: patientClinicById.get(r.patientId) || null } }));

  // Resolved lazily, and only once each — most boots have zero orphans, and
  // even when there are some, they usually share the same fallback answer.
  let defaultClinicId;
  let oldestClinicId;
  let resolved = 0;
  let skipped = 0;

  for (const appt of orphans) {
    let clinicId = appt.patient?.clinicId || null;
    if (!clinicId) {
      if (defaultClinicId === undefined) defaultClinicId = await getDefaultClinicId();
      clinicId = defaultClinicId;
    }
    if (!clinicId) {
      if (oldestClinicId === undefined) oldestClinicId = await getOldestActiveClinicId();
      clinicId = oldestClinicId;
    }
    if (!clinicId) {
      skipped++;
      console.error(`[backfill-appointment-clinicid] Appointment ${appt.id}: no clinic could be resolved (patient has none, no default tenant, no active clinic at all) — left null.`);
      continue;
    }
    await prisma.appointment.update({ where: { id: appt.id }, data: { clinicId } });
    resolved++;
  }

  console.log(`[backfill-appointment-clinicid] Resolved ${resolved} appointment(s), skipped ${skipped}.`);
  if (skipped > 0) {
    console.error(`[backfill-appointment-clinicid] WARNING: ${skipped} appointment(s) still have a null clinicId — the upcoming "db push" schema sync WILL FAIL to apply the NOT NULL constraint until these are fixed manually.`);
  }
}

main()
  .catch((err) => console.error('[backfill-appointment-clinicid] Error:', err.message))
  .finally(() => prisma.$disconnect());
