// One-off script: the 23 articles created today (2026-07-30) all share the
// same publish date, which looks unnatural on the public /articles list.
// This spreads their `createdAt` (the field used everywhere as "published
// date" — see app/articles/page.tsx, app/articles/[slug]/page.tsx) across the
// last ~2-3 months, keeping their original relative order (oldest-created
// today -> oldest new date) so prev/next article navigation stays sensible.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DAYS_AGO = 7;   // most recent new date
const MAX_DAYS_AGO = 90;  // oldest new date (~3 months)

function randomTimeOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(8 + Math.floor(Math.random() * 10)); // business-hours-ish, 08:00-18:00
  d.setUTCMinutes(Math.floor(Math.random() * 60));
  d.setUTCSeconds(Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  const start = new Date("2026-07-30T00:00:00Z");
  const end = new Date("2026-07-31T00:00:00Z");

  const articles = await prisma.article.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { id: true, slug: true, title: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (articles.length === 0) {
    console.log("No articles created today — nothing to do.");
    return;
  }

  const now = Date.now();
  // One random days-ago value per article, sorted descending so the article
  // that was originally created first today gets pushed furthest back.
  const daysAgoList = articles
    .map(() => MIN_DAYS_AGO + Math.random() * (MAX_DAYS_AGO - MIN_DAYS_AGO))
    .sort((a, b) => b - a);

  console.log(`Updating ${articles.length} articles...\n`);

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const newDate = randomTimeOfDay(new Date(now - daysAgoList[i] * DAY_MS));

    await prisma.article.update({
      where: { id: article.id },
      data: { createdAt: newDate },
    });

    console.log(
      `${article.slug.padEnd(45)} ${article.createdAt.toISOString()} -> ${newDate.toISOString()}`
    );
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
