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

# Sync DB schema — works on fresh DB (Render) and existing DB.
# prisma db push is idempotent: creates tables if missing, no-ops if already in sync.
# Pin to 6.7.0 to avoid breaking changes from future Prisma major versions.
echo "[start.sh] Syncing database schema..."
npx prisma@6.7.0 db push --skip-generate --accept-data-loss || echo "[start.sh] DB sync warning — check logs"

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

echo "[start.sh] Startup maintenance tasks done — server already serving traffic."

# Keep the container alive as long as the Next.js server process is running,
# and forward its exit code (so Coolify/Docker correctly detects a crash).
wait "$SERVER_PID"
