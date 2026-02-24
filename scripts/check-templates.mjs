import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const rows = await p.emailTemplate.findMany({ select: { slug: true, name: true, isActive: true } });
rows.forEach(t => console.log(t.slug, '-', t.name, t.isActive ? '✓' : '✗'));
console.log('Total:', rows.length);
await p.$disconnect();
