const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findMany({
    where: { firstName: { contains: 'Lucas' } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, profileCompleted: true, createdAt: true }
  });
  console.log('USERS:', JSON.stringify(u, null, 2));
  if (u[0]) {
    const ms = await p.medicalScreening.findFirst({ where: { userId: u[0].id }, select: { id: true, isSubmitted: true, consentGiven: true, createdAt: true } });
    console.log('SCREENING:', ms ? JSON.stringify(ms, null, 2) : 'NONE');
  }
  await p.$disconnect();
})();
