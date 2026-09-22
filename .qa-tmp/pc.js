const { PrismaClient } = require('@prisma/client');
const { RED_FLAGS, pick } = require('./lib');
const p = new PrismaClient();
(async () => {
  const s = await p.medicalScreening.findUnique({ where: { userId: 'cmucgsgkl0006xz4wrjx7vqsd' } });
  if (!s) { console.log('Nenhuma triagem gravada para PC.'); await p.$disconnect(); return; }
  console.log('PC (Carla) NAO respondeu nenhuma das 12 na tela — so navegou ate a etapa 8.');
  console.log('O que o autosave gravou:\n');
  console.log(JSON.stringify(pick(s, RED_FLAGS), null, 1));
  console.log('\nfalse gravados:', RED_FLAGS.filter(k => s[k] === false).length, '/12');
  console.log('consentGiven:', s.consentGiven, '| isSubmitted:', s.isSubmitted, '| filledBy:', s.filledBy);
  await p.$disconnect();
})();
