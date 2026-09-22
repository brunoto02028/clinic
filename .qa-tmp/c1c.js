const { PrismaClient } = require('@prisma/client');
const { api, RED_FLAGS, pick } = require('./lib');
const p = new PrismaClient();
const PF = 'cmucgsgnl000axz4wdj06dkug';
(async () => {
  await p.medicalScreening.deleteMany({ where: { userId: PF } });
  console.log('Paciente NOVO, sem triagem nenhuma. Abre o app e avanca da etapa 0 para a 1.');
  console.log('O app autossalva o form, que nessa altura so tem a ocupacao.\n');
  const r = await api('pf', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ occupation: 'Professora', _autosave: true }) });
  console.log('POST autosave -> HTTP', r.status, JSON.stringify(r.body));
  const s = await p.medicalScreening.findUnique({ where: { userId: PF } });
  if (!s) { console.log('\n>>> Nenhuma linha criada.'); await p.$disconnect(); return; }
  console.log('\n--- O QUE FICOU GRAVADO NO BANCO ---');
  console.log('red flags:', JSON.stringify(pick(s, RED_FLAGS), null, 1));
  const falses = RED_FLAGS.filter(k => s[k] === false).length;
  const nulls  = RED_FLAGS.filter(k => s[k] === null).length;
  console.log(`\n>>> red flags gravadas como false (= "Nao"): ${falses}/12`);
  console.log(`>>> red flags gravadas como null (= nao respondida): ${nulls}/12`);
  console.log('>>> consentGiven:', s.consentGiven, '| filledBy:', s.filledBy, '| isSubmitted:', s.isSubmitted);
  console.log('\nNenhuma dessas 12 perguntas foi feita ao paciente: ele so digitou a ocupacao.');
  await p.$disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
