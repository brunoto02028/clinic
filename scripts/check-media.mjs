import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const imgs = await p.imageLibrary.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, url: true, filename: true, createdAt: true } });
imgs.forEach(i => console.log(i.url, '|', i.filename));
const s = await p.siteSettings.findFirst({ select: { logoUrl: true, darkLogoUrl: true } });
console.log('\nsiteSettings:', JSON.stringify(s));
await p.$disconnect();
