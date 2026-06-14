const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.siteSettings.findFirst().then(s => {
  const sl = s.screenLogos;
  if (sl) {
    const keys = Object.keys(sl);
    console.log('screenLogos keys:', keys);
    keys.forEach(k => {
      const v = sl[k];
      const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
      console.log(k, '->', str.substring(0, 120));
    });
  } else {
    console.log('screenLogos: null');
  }
  console.log('logoUrl:', s.logoUrl ? s.logoUrl.substring(0,80) : 'null');
}).finally(() => p.$disconnect());
