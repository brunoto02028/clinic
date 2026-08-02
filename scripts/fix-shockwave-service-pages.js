// One-off, idempotent cleanup: removes any DB-driven ServicePage entries
// that promote shockwave therapy (not an offered treatment — confirmed with
// BPR, see also the P2 fixes to components/landing-page.tsx, app/therapies
// and the hardcoded app/services/[slug] SERVICE_DATA). Safe to run on every
// deploy — matches by slug/title containing "shockwave" (case-insensitive),
// so it silently no-ops once none remain.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.servicePage.findMany({
    where: {
      OR: [
        { slug: { contains: 'shockwave', mode: 'insensitive' } },
        { titleEn: { contains: 'shockwave', mode: 'insensitive' } },
        { titlePt: { contains: 'choque', mode: 'insensitive' } },
      ],
    },
    select: { id: true, slug: true, titleEn: true },
  });

  if (candidates.length === 0) {
    console.log('[fix-shockwave] nothing to do — no matching service pages');
    return;
  }

  for (const page of candidates) {
    await prisma.servicePage.delete({ where: { id: page.id } });
    console.log(`[fix-shockwave] deleted service page "${page.slug}" (${page.titleEn})`);
  }
}

main()
  .catch((e) => {
    console.error('[fix-shockwave] error', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
