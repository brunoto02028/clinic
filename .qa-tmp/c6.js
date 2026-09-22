const { PrismaClient } = require('@prisma/client');
const { api, RED_FLAGS, pick } = require('./lib');
const p = new PrismaClient();
const PA = 'cmucgsghc0002xz4w082nmb9y';
const W = JSON.parse(require('fs').readFileSync('./.qa-tmp/webpayload.json','utf8'));
const snap = () => p.medicalScreening.findUnique({ where: { userId: PA } });
(async () => {
  const before = await snap();
  console.log('Estado atual de PA (preenchido pela web):');
  console.log('  cancerHistory =', before.cancerHistory, '| nightPain =', before.nightPain, '| osteoporosisRisk =', before.osteoporosisRisk);

  console.log('\n== A paciente volta ao formulario WEB e DESMARCA 3 red flags (true -> false) ==');
  const flipped = { ...W, cancerHistory: false, nightPain: false, osteoporosisRisk: false,
                    painPattern: 'ALTERADO NA WEB', _autosave: true };
  const r = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify(flipped) });
  console.log('POST -> HTTP', r.status, JSON.stringify(r.body));
  const after = await snap();
  console.log('\n--- BANCO depois ---');
  console.log('  cancerHistory =', after.cancerHistory, '| nightPain =', after.nightPain, '| osteoporosisRisk =', after.osteoporosisRisk);
  console.log('  painPattern   =', JSON.stringify(after.painPattern));
  const flips = ['cancerHistory','nightPain','osteoporosisRisk'];
  console.log('\n>>> false EXPLICITO foi gravado (nao ignorado)?', flips.every(k => after[k] === false) ? 'SIM' : 'NAO');
  console.log('>>> os outros 9 continuam com o valor da web?', RED_FLAGS.filter(k=>!flips.includes(k)).every(k => after[k] === W[k]) ? 'SIM' : 'NAO');
  console.log('>>> texto atualizado?', after.painPattern === 'ALTERADO NA WEB' ? 'SIM' : 'NAO');

  console.log('\n== Bonus: string numa coluna Boolean (o que o app antigo mandava: smoker:"yes") ==');
  const r2 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ smoker: 'yes', _autosave: true }) });
  const s2 = await snap();
  console.log('POST smoker:"yes" -> HTTP', r2.status, JSON.stringify(r2.body));
  console.log('smoker no banco:', s2.smoker, `(tipo ${typeof s2.smoker}) — antes estourava 500`);

  console.log('\n== Campo string enviado como "" (vazio) sobrescreve? ==');
  const r3 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ gpDetails: '', _autosave: true }) });
  const s3 = await snap();
  console.log('POST gpDetails:"" -> HTTP', r3.status, '| gpDetails agora:', JSON.stringify(s3.gpDetails));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
