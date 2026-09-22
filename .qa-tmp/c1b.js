const { PrismaClient } = require('@prisma/client');
const { api, RED_FLAGS, TEXT_AT_RISK, pick } = require('./lib');
const p = new PrismaClient();
const PA = 'cmucgsghc0002xz4w082nmb9y';
const W = JSON.parse(require('fs').readFileSync('./.qa-tmp/webpayload.json','utf8'));

const snap = async () => p.medicalScreening.findUnique({ where: { userId: PA } });
const show = (l, s) => {
  console.log(`\n--- ${l} ---`);
  console.log('red flags :', JSON.stringify(pick(s, RED_FLAGS)));
  console.log('texts     :', JSON.stringify(pick(s, TEXT_AT_RISK)));
  console.log('consent:', s&&s.consentGiven, '| occupation:', s&&s.occupation, '| isLocked:', s&&s.isLocked, '| isSubmitted:', s&&s.isSubmitted);
};

(async () => {
  await p.medicalScreening.deleteMany({ where: { userId: PA } });

  console.log('== PASSO 1: paciente preenche na WEB e o form autossalva (rascunho, isLocked=false) ==');
  const r1 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ ...W, _autosave: true }) });
  console.log('HTTP', r1.status, JSON.stringify(r1.body));
  const afterWeb = await snap();
  show('BANCO apos preencher na WEB', afterWeb);
  console.log('>>> destrancado? isLocked =', afterWeb.isLocked, '(precisa ser false para o teste valer)');

  console.log('\n== PASSO 2: app abre a triagem (GET) e navega ate a etapa 3 -> autosave do form prefilled ==');
  const g = await api('pa', '/api/medical-screening');
  const appForm = { ...g.body.screening, occupation: 'Contadora EDITADA NO APP' };
  const r2 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ ...appForm, _autosave: true }) });
  console.log('HTTP', r2.status, JSON.stringify(r2.body));
  show('BANCO apos autosave real do app', await snap());

  console.log('\n== PASSO 3: autosave PARCIAL (payload so com occupation) — exercita presentScreeningFields ==');
  const r3 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ occupation: 'SO ESTE CAMPO', _autosave: true }) });
  console.log('HTTP', r3.status, JSON.stringify(r3.body));
  const final = await snap();
  show('BANCO apos autosave parcial', final);

  const rfBad = RED_FLAGS.filter(k => final[k] !== W[k]);
  const txBad = TEXT_AT_RISK.filter(k => final[k] !== W[k]);
  console.log('\n>>> RED FLAGS preservadas:', rfBad.length === 0 ? 'SIM (12/12)' : 'NAO');
  rfBad.forEach(k => console.log('   PERDIDO', k, W[k], '->', final[k]));
  console.log('>>> TEXTOS preservados :', txBad.length === 0 ? 'SIM (5/5)' : 'NAO');
  txBad.forEach(k => console.log('   PERDIDO', k, JSON.stringify(W[k]), '->', JSON.stringify(final[k])));
  console.log('>>> occupation final   :', JSON.stringify(final.occupation), '(esperado "SO ESTE CAMPO")');
  console.log('>>> consentGiven       :', final.consentGiven, '(veio da web, deve continuar true)');
  await p.$disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
