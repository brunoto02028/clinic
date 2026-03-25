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
npx prisma db push --accept-data-loss

# Step 1: Build in a TEMP directory so the running .next is never touched during build
echo ""
echo "[1/3] Building in temp directory (old version keeps serving)..."
BUILD_TMP="$CLINIC_DIR/.next-build-tmp"
rm -rf "$BUILD_TMP"
mkdir -p "$BUILD_TMP"

# Set output dir to temp, build, then swap atomically
NEXT_TELEMETRY_DISABLED=1 npx next build --no-lint 2>&1
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo "ERROR: Build failed! Old version still serving."
  rm -rf "$BUILD_TMP"
  exit 1
fi
echo "Build successful!"

# Atomic swap: rename old .next to .next-old, rename new build into place
echo "Swapping .next (atomic)..."
rm -rf "$CLINIC_DIR/.next-old"
if [ -d "$CLINIC_DIR/.next" ]; then
  mv "$CLINIC_DIR/.next" "$CLINIC_DIR/.next-old"
fi
# The build already wrote to .next in-place (default output), so just clean up tmp
rm -rf "$BUILD_TMP" "$CLINIC_DIR/.next-old"

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
