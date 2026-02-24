import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const s = await p.siteSettings.findFirst();
console.log('logoUrl:', s?.logoUrl);
console.log('darkLogoUrl:', s?.darkLogoUrl);
await p.$disconnect();
