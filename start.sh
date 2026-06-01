#!/bin/sh
set -e

# Run migrations on startup
echo "[start.sh] Running database migrations..."
npx prisma migrate deploy || echo "[start.sh] Migration failed or already up to date"

# Create upload directories if UPLOADS_DIR is set
if [ -n "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_DIR" || true
  chown -R nextjs:nodejs "$UPLOADS_DIR" 2>/dev/null || true
  chmod -R 755 "$UPLOADS_DIR" 2>/dev/null || true
  echo "[start.sh] Upload directory ready: $UPLOADS_DIR"
fi

# Start the app (Railway handles port via $PORT env var)
echo "[start.sh] Starting Next.js server..."
exec su-exec nextjs node server.js
