const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.siteSettings.findMany({ select: { id: true, heroImageUrl: true, insolesImageUrl: true, bioImageUrl: true, thermoImageUrl: true, mlsLaserJson: true, clinicId: true } })
  .then(rows => {
    console.log('Total SiteSettings records:', rows.length);
    rows.forEach((r, i) => {
      console.log(`\nRecord ${i+1} (id: ${r.id}, clinicId: ${r.clinicId}):`);
      console.log('  heroImageUrl:', r.heroImageUrl ? r.heroImageUrl.substring(0,60) : 'null');
      console.log('  insolesImageUrl:', r.insolesImageUrl ? r.insolesImageUrl.substring(0,60) : 'null');
      console.log('  bioImageUrl:', r.bioImageUrl ? r.bioImageUrl.substring(0,60) : 'null');
      console.log('  thermoImageUrl:', r.thermoImageUrl ? r.thermoImageUrl.substring(0,60) : 'null');
      const mls = r.mlsLaserJson ? JSON.parse(r.mlsLaserJson) : null;
      console.log('  mlsLaserJson.treatmentImageUrl:', mls?.treatmentImageUrl ? mls.treatmentImageUrl.substring(0,60) : 'null');
    });
  })
  .finally(() => p.$disconnect());
