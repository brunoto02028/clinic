#!/bin/sh
set -e

# Sync DB schema — works on fresh DB (Render) and existing DB.
# prisma db push is idempotent: creates tables if missing, no-ops if already in sync.
# Pin to 6.7.0 to avoid breaking changes from future Prisma major versions.
echo "[start.sh] Syncing database schema..."
npx prisma@6.7.0 db push --skip-generate --accept-data-loss || echo "[start.sh] DB sync warning — check logs"

# ONE-OFF: spread the publish dates of the batch of articles created on
# 2026-07-30 across the last ~2-3 months (they all shared today's date,
# which looked unnatural on the public /articles list). Idempotent — only
# matches articles still dated 2026-07-30, so it silently no-ops on every
# deploy after the first successful run. Safe to remove once confirmed live.
echo "[start.sh] Checking for one-off article date fix..."
cat > /tmp/article-date-fix.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DAYS_AGO = 7, MAX_DAYS_AGO = 90;
function randomTimeOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(8 + Math.floor(Math.random() * 10));
  d.setUTCMinutes(Math.floor(Math.random() * 60));
  d.setUTCSeconds(Math.floor(Math.random() * 60));
  return d;
}
(async () => {
  const start = new Date('2026-07-30T00:00:00Z');
  const end = new Date('2026-07-31T00:00:00Z');
  const articles = await prisma.article.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (articles.length === 0) {
    console.log('[article-date-fix] nothing to do (already applied or no matching articles)');
    return;
  }
  const now = Date.now();
  const daysAgoList = articles
    .map(() => MIN_DAYS_AGO + Math.random() * (MAX_DAYS_AGO - MIN_DAYS_AGO))
    .sort((a, b) => b - a);
  for (let i = 0; i < articles.length; i++) {
    const newDate = randomTimeOfDay(new Date(now - daysAgoList[i] * DAY_MS));
    await prisma.article.update({ where: { id: articles[i].id }, data: { createdAt: newDate } });
  }
  console.log(`[article-date-fix] updated ${articles.length} articles`);
})()
  .catch((e) => console.error('[article-date-fix] error', e))
  .finally(() => prisma.$disconnect());
EOF
node /tmp/article-date-fix.js || echo "[start.sh] article date fix warning — check logs"

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
