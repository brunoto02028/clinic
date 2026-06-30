const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const all = await p.siteSettings.findMany({
    select: { id: true, heroImageUrl: true, screenLogos: true },
    orderBy: { id: 'asc' },
  });

  console.log('Total records:', all.length);
  if (all.length <= 1) { console.log('Nothing to fix.'); return; }

  // Keep the record with the most data (has heroImageUrl or screenLogos)
  const keeper = all.find(r => r.heroImageUrl || r.screenLogos) || all[0];
  const toDelete = all.filter(r => r.id !== keeper.id);

  console.log('Keeping:', keeper.id);
  for (const r of toDelete) {
    await p.siteSettings.delete({ where: { id: r.id } });
    console.log('Deleted:', r.id);
  }
  console.log('Done. Only one SiteSettings record remains.');
}

main().catch(console.error).finally(() => p.$disconnect());
