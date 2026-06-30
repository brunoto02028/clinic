#!/bin/sh
set -e

# Sync DB schema — works on fresh DB (Render) and existing DB.
# prisma db push is idempotent: creates tables if missing, no-ops if already in sync.
# Pin to 6.7.0 to avoid breaking changes from future Prisma major versions.
echo "[start.sh] Syncing database schema..."
npx prisma@6.7.0 db push --skip-generate || echo "[start.sh] DB sync warning — check logs"

# Create upload directories if UPLOADS_DIR is set
if [ -n "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_DIR" || true
  chown -R nextjs:nodejs "$UPLOADS_DIR" 2>/dev/null || true
  chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || true
  echo "[start.sh] Upload directory ready: $UPLOADS_DIR"
fi

# Start the Next.js server — PORT is set by Render/Railway automatically
echo "[start.sh] Starting Next.js server on port ${PORT:-3000}..."
exec su-exec nextjs node server.js
