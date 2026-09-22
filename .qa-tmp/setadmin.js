const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('QaTest!2026', 10);
  await p.user.update({ where: { email: 'qa.admina@example.test' }, data: { password: hash, isActive: true, emailVerified: new Date() } });
  console.log('senha do admin QA Clinic A redefinida para o teste');
  // Reconstruir o estado do PF: paciente novo que so digitou a ocupacao no app.
  const PF = 'cmucgsgnl000axz4wdj06dkug';
  await p.medicalScreening.deleteMany({ where: { userId: PF } });
  console.log('triagem de PF limpa — sera recriada pelo autosave do app');
  await p.$disconnect();
})();
