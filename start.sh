#!/bin/sh
set -e

# Run migrations on startup
# Pin Prisma CLI to the project version — npx must NOT fetch Prisma 7.x
# (Prisma 7 dropped the `url` datasource property and breaks our schema)
echo "[start.sh] Running database migrations..."
npx prisma@6.7.0 migrate deploy || echo "[start.sh] Migration failed or already up to date"

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
