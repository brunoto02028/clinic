#!/bin/bash
# Zero-downtime deploy script for bpr.rehab
# NEVER deletes .next before building — builds in-place, then graceful restart
set -e

CLINIC_DIR="/root/clinic"

echo "=== BPR.REHAB Zero-Downtime Deploy ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"

cd "$CLINIC_DIR"

# Step 0: Apply Prisma schema changes (safe, idempotent)
echo ""
echo "[0/3] Applying Prisma schema (db push)..."
npx prisma db push

# Step 1: Build in-place (DO NOT delete .next — old files keep serving during build)
echo ""
echo "[1/3] Building (in-place, zero-downtime)..."
npm run build

if [ $? -ne 0 ]; then
  echo "ERROR: Build failed! Old version still serving."
  exit 1
fi
echo "Build successful!"

# Step 2: Graceful PM2 reload (serves new build)
echo ""
echo "[2/3] Restarting PM2 (graceful reload)..."
pm2 reload clinic --update-env
echo "PM2 reloaded!"

# Step 3: Verify uploads symlink
echo ""
echo "[3/3] Verifying uploads symlink..."
if [ ! -L "$CLINIC_DIR/public/uploads" ]; then
  echo "WARNING: uploads symlink broken, fixing..."
  rm -rf "$CLINIC_DIR/public/uploads"
  ln -sfn /root/clinic-uploads "$CLINIC_DIR/public/uploads"
  echo "Symlink fixed!"
else
  echo "Symlink OK."
fi

echo ""
echo "=== Deploy complete! ==="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
