#!/bin/sh
set -e

# Create upload directories on Railway Volume (runs as root before dropping to nextjs)
mkdir -p "${UPLOADS_DIR:-/app/data/uploads}"
chown -R nextjs:nodejs "${UPLOADS_DIR:-/app/data/uploads}" 2>/dev/null || true
chmod -R 755 "${UPLOADS_DIR:-/app/data/uploads}" 2>/dev/null || true

echo "[start.sh] Upload directory ready: ${UPLOADS_DIR:-/app/data/uploads}"

# Drop to nextjs user and start the app
exec su-exec nextjs node server.js
