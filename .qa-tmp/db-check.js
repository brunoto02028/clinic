require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const clinics = await p.clinic.findMany({ select: { id: true, name: true, slug: true, type: true }, take: 20 });
  console.log('CLINICS:', JSON.stringify(clinics, null, 2));
  const n = await p.user.count();
  console.log('users:', n);
  const ss = await p.siteSettings.findMany({ select: { id: true, clinicId: true, siteName: true } });
  console.log('SITESETTINGS:', JSON.stringify(ss, null, 2));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
