#!/bin/bash
cd /root/clinic
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.siteSettings.deleteMany().then(r => {
  console.log('Deleted settings:', r.count);
  console.log('Next GET request will recreate with updated defaults');
  return p.\$disconnect();
}).catch(e => { console.error(e); process.exit(1); });
"
