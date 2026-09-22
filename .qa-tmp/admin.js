const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const us = await p.user.findMany({ where: { clinicId: 'cmu6aoc2j0000xz8oaserpn4m', role: { not: 'PATIENT' } }, select: { id: true, email: true, role: true } });
  console.log('nao-pacientes em QA Clinic A:', JSON.stringify(us, null, 1));
  await p.$disconnect();
})();
