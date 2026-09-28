#!/bin/sh
set -e

# Create upload directories if UPLOADS_DIR is set (fast, do before boot)
if [ -n "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_DIR" || true
  chown -R nextjs:nodejs "$UPLOADS_DIR" 2>/dev/null || true
  chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || true
  echo "[start.sh] Upload directory ready: $UPLOADS_DIR"
fi

# Start the Next.js server FIRST, in the background — this is what makes the
# site stop being "down" during a deploy. The DB schema sync + seed/cleanup
# scripts below used to run BEFORE the server started listening, which could
# take anywhere from several seconds to a couple of minutes depending on DB
# latency — during that whole window Coolify had nothing to route traffic to,
# so the site appeared offline on every deploy. Now the server binds to the
# port within a second or two of container start, and the maintenance tasks
# run afterwards without blocking it.
echo "[start.sh] Starting Next.js server on port ${PORT:-3000}..."
su-exec nextjs node server.js &
SERVER_PID=$!

# Forward Docker/Coolify's stop signal to the Next.js process so shutdowns
# are graceful (in-flight requests finish) instead of an abrupt kill —
# without this trap, only this wrapper shell (PID 1) would receive SIGTERM.
trap 'echo "[start.sh] Received stop signal, forwarding to server..."; kill -TERM "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID"' TERM INT

# Activity 38 T-2: Appointment.clinicId is now a required column. Unlike
# every maintenance script below, this one has to run BEFORE the schema sync
# — a null clinicId still in the DB when `db push` applies the NOT NULL
# constraint would fail that step (or worse). See
# scripts/backfill-appointment-clinicid.js for the resolution order.
echo "[start.sh] Backfilling Appointment.clinicId before schema sync..."
node /app/scripts/backfill-appointment-clinicid.js || echo "[start.sh] appointment clinicId backfill warning — check logs"

# Sync DB schema — works on fresh DB (Render) and existing DB.
# prisma db push is idempotent: creates tables if missing, no-ops if already in sync.
# Pin to 6.7.0 to avoid breaking changes from future Prisma major versions.
echo "[start.sh] Syncing database schema..."
npx prisma@6.7.0 db push --skip-generate --accept-data-loss || echo "[start.sh] DB sync warning — check logs"

# Emergency bootstrap: creates Bruno's SUPERADMIN account if the User table
# is completely empty — permanently a no-op after the first successful run.
# See scripts/seed-admin-user.js for the full story (Aug 2026 VPS reinstall
# wiped auth with no other way back in).
echo "[start.sh] Checking for bootstrap admin user..."
node /app/scripts/seed-admin-user.js || echo "[start.sh] admin bootstrap warning — check logs"

# Emergency bootstrap: creates the single BPR Clinic row if the Clinic table
# is completely empty — permanently a no-op after the first successful run.
# See scripts/seed-clinic.js. Without this, every clinic-scoped feature
# (Instagram/Facebook connect included) fails with "No clinic context".
echo "[start.sh] Checking for bootstrap clinic..."
node /app/scripts/seed-clinic.js || echo "[start.sh] clinic bootstrap warning — check logs"

# Instagram-import permission gate (activity 36): CLINIC-type tenants keep
# the access they already had; PERSONAL_TRAINER stays opt-in (see
# scripts/backfill-instagram-import-flag.js) — true-once, not just
# idempotent (a SystemConfig marker stops it from re-enabling a CLINIC a
# SUPERADMIN deliberately disabled). Runs early, right after the clinic
# bootstrap it depends on: unlike the content-seeding scripts below, a late
# run here means real requests get wrongly 403'd on an already-working
# feature during the boot window (server starts serving traffic before this
# file finishes — see the note above SERVER_PID).
echo "[start.sh] Backfilling instagramImportEnabled for existing clinic tenants..."
node /app/scripts/backfill-instagram-import-flag.js || echo "[start.sh] instagram-import flag backfill warning — check logs"

# Seed the lead-magnet PDF guides (idempotent — skips guides that already
# exist by slug, see scripts/seed-lead-magnet-guides.js). P1.2/P3 of
# BPR_Devin_Spec_Website_Improvements.md.
echo "[start.sh] Seeding lead-magnet guides..."
node /app/scripts/seed-lead-magnet-guides.js || echo "[start.sh] guide seed warning — check logs"

# Remove any DB-driven service pages still promoting shockwave therapy —
# not an offered treatment (P2). Idempotent, see
# scripts/fix-shockwave-service-pages.js.
echo "[start.sh] Checking for shockwave service pages to remove..."
node /app/scripts/fix-shockwave-service-pages.js || echo "[start.sh] shockwave cleanup warning — check logs"

# Seed the Beyond Pain book config + chapter content — idempotent, skips
# chapters that already exist by slug (see scripts/seed-book-content.js).
# BPR_Devin_Spec_Beyond_Pain_Book.md.
echo "[start.sh] Seeding Beyond Pain book content..."
node /app/scripts/seed-book-content.js || echo "[start.sh] book content seed warning — check logs"


# Re-import article content recovered after the Aug 2026 VPS reinstall wiped
# the database — idempotent, skips slugs that already exist, no-ops until a
# SUPERADMIN/ADMIN user exists to attribute authorship to (see
# scripts/seed-recovered-articles.js). Imports as drafts for manual review.
echo "[start.sh] Seeding recovered article content..."
node /app/scripts/seed-recovered-articles.js || echo "[start.sh] recovered-articles seed warning — check logs"

# Default logo/favicon recovered after the same VPS reinstall — idempotent,
# only fills in fields still empty (see scripts/seed-site-logo.js).
echo "[start.sh] Seeding default logo/favicon..."
node /app/scripts/seed-site-logo.js || echo "[start.sh] logo seed warning — check logs"

# Activity 46: prescriptions created by assigning a protocol now carry that
# protocol's id, so archiving the plan takes its exercises out of the patient's
# app too. Older rows get the link here. Idempotent (only rows without one).
echo "[start.sh] Backfilling ExercisePrescription.protocolId..."
node /app/scripts/backfill-prescription-protocolid.js || echo "[start.sh] prescription protocolId backfill warning — check logs"

# Activity 45: protocol templates are per clinic now and every template route
# filters by it — older templates without a clinic get their author's clinic.
# Idempotent (only rows still without one); see the script.
echo "[start.sh] Backfilling ProtocolTemplate.clinicId..."
node /app/scripts/backfill-protocol-template-clinicid.js || echo "[start.sh] protocol template clinicId backfill warning — check logs"

# Activity 71: app/api/admin/email/route.ts never filtered anything by
# clinicId, so any signed-in staff (any clinic) could list/approve/discard/
# delete another clinic's financial emails — found via a patient's invoice.
# The route now scopes every action, but rows created before this fix (the
# "send"/"sync" actions never set clinicId) would just disappear from their
# own clinic's inbox instead of being visible again — this backfill runs
# first so the fix never looks like lost history. Idempotent (only rows
# still without one); see the script.
echo "[start.sh] Backfilling EmailMessage.clinicId..."
node /app/scripts/backfill-email-message-clinicid.js || echo "[start.sh] email clinicId backfill warning — check logs"

# Activity 72: invoices had no structured record before this activity — just
# a PDF/HTML attachment on a generic EmailMessage. This creates a
# PatientInvoice for each of the handful of historical invoice e-mails
# (grouped by invoiceNumber, original number preserved — never reissued) and
# links them back via EmailMessage.patientInvoiceId. Idempotent (only rows
# with templateSlug INVOICE and patientInvoiceId still null); safe to leave
# running on every boot even though the real backfill work is a one-time
# handful of rows.
echo "[start.sh] Backfilling historical PatientInvoice records..."
node /app/scripts/backfill-patient-invoices.js || echo "[start.sh] patient invoice backfill warning — check logs"

# ACL reconstruction post-op protocol template (13/09/2026 request) — idempotent,
# skips if a template with this name already exists, no-ops until an
# ADMIN/SUPERADMIN account exists to attribute authorship to (see
# scripts/seed-acl-protocol.js).
echo "[start.sh] Seeding ACL reconstruction protocol template..."
node /app/scripts/seed-acl-protocol.js || echo "[start.sh] ACL protocol seed warning — check logs"

# The automation rules (activities 72 and 74). They were seeded by hand, which
# meant production had none: /admin/automation listed nothing and the clinic
# could not change a threshold without a deploy — the exact thing putting them
# in a rule was meant to fix. Idempotent, and it never touches a clinic's own
# override row.
# Mensagens e triagens criadas sem tenant (auditoria de paridade, 24/09/2026).
# Só preenche nulos; nunca altera linha que já tem clínica.
echo "[start.sh] Backfilling clinicId on messages and screenings..."
node /app/scripts/backfill-message-screening-clinicid.js || echo "[start.sh] clinicId backfill warning — check logs"

# O aceite dos termos vivia em duas colunas: a triagem gravava
# `consentGiven`, o portal (e agora o servidor) le `consentAcceptedAt`. Quem
# aceitou pelo app ficaria trancado, e a triagem e travada depois do envio —
# nao teria como aceitar de novo. So preenche nulos, com a data do aceite.
echo "[start.sh] Backfilling consent acceptance..."
node /app/scripts/backfill-consent-accepted-at.js || echo "[start.sh] consent backfill warning — check logs"

# A coluna lastReadingAt nasceu vazia (075, T-11): sem isto todo aparelho
# apareceria mudo ha meses no primeiro boot, inclusive os que reportam todo
# dia. So preenche nulos, a partir do que ja esta no banco.
echo "[start.sh] Backfilling wearable last reading..."
node /app/scripts/backfill-wearable-last-reading.js || echo "[start.sh] last-reading backfill warning — check logs"

echo "[start.sh] Seeding automation rules..."
node /app/scripts/seed-automation-rules.js || echo "[start.sh] automation rules seed warning — check logs"

# Home-kit catalogue of the laboratory partner (081). New kits are born
# inactive; the clinic's price and on/off switch are never overwritten.
# Quem a clinica ja atendeu continua vendo a area clinica depois de 083.
# So preenche false -> true, a partir do que ja existe no banco.
echo "[start.sh] Backfilling clinic-patient flag..."
node /app/scripts/backfill-clinic-patient-flag.js || echo "[start.sh] clinic-patient backfill warning — check logs"

echo "[start.sh] Seeding lab products..."
node /app/scripts/seed-lab-products.js || echo "[start.sh] lab products seed warning — check logs"

# Corrects generic template placeholder content (wrong city, fake address,
# placeholder phone) that app/api/settings/route.ts's auto-create used to
# fill in on a fresh DB — idempotent, only touches fields still matching the
# known-bad text (see scripts/fix-generic-site-defaults.js).
echo "[start.sh] Fixing generic site-settings placeholders..."
node /app/scripts/fix-generic-site-defaults.js || echo "[start.sh] site-defaults fix warning — check logs"

# BA One identity unification (activity 34): personal-trainer tenants move to
# the new moss brand colour now — idempotent, only touches a Clinic still on
# the exact old default (see scripts/migrate-personal-trainer-colors.js).
echo "[start.sh] Migrating personal-trainer default colours to BA One moss..."
node /app/scripts/migrate-personal-trainer-colors.js || echo "[start.sh] personal-trainer colour migration warning — check logs"

echo "[start.sh] Startup maintenance tasks done — server already serving traffic."

# Keep the container alive as long as the Next.js server process is running,
# and forward its exit code (so Coolify/Docker correctly detects a crash).
wait "$SERVER_PID"
