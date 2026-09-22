const { PrismaClient } = require('@prisma/client');
const { api, RED_FLAGS, pick } = require('./lib');
const p = new PrismaClient();
const PB = 'cmucgsgj10004xz4wg45fwg5e';
const snap = () => p.medicalScreening.findUnique({ where: { userId: PB } });

// Respostas REAIS do paciente no app: mistura deliberada de Sim e Nao.
const ANSWERS = {
  unexplainedWeightLoss: false, nightPain: true,  traumaHistory: true,
  neurologicalSymptoms: false,  bladderBowelDysfunction: false, recentInfection: true,
  cancerHistory: false,         steroidUse: true,  osteoporosisRisk: false,
  cardiovascularSymptoms: true, severeHeadache: false, dizzinessBalanceIssues: false,
};

(async () => {
  await p.medicalScreening.deleteMany({ where: { userId: PB } });

  console.log('===== C2: submeter SEM consentimento =====');
  const r2 = await api('pb', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ ...ANSWERS, occupation: 'Designer' }) });
  console.log('POST (submit, consentGiven ausente) -> HTTP', r2.status, JSON.stringify(r2.body));
  const s2 = await snap();
  console.log('Linha no banco?', s2 ? 'SIM (!!)' : 'NAO — nada gravado');

  console.log('\nE com consentGiven: false explicito?');
  const r2b = await api('pb', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ ...ANSWERS, consentGiven: false }) });
  console.log('-> HTTP', r2b.status, JSON.stringify(r2b.body));
  console.log('Linha no banco?', (await snap()) ? 'SIM (!!)' : 'NAO — nada gravado');

  console.log('\n===== C3 + C4: submeter COM consentimento, 12 respondidas, smoker=Fumante =====');
  const r3 = await api('pb', '/api/medical-screening', { method: 'POST', body: JSON.stringify({
    ...ANSWERS, consentGiven: true, smoker: true, occupation: 'Designer', chiefComplaint: 'Dor no ombro',
  })});
  console.log('POST -> HTTP', r3.status, (r3.body && r3.body.message) || JSON.stringify(r3.body).slice(0,300));
  const s3 = await snap();
  if (!s3) { console.log('Nada gravado.'); await p.$disconnect(); return; }
  console.log('\n--- BANCO ---');
  console.log('red flags:', JSON.stringify(pick(s3, RED_FLAGS), null, 1));
  const mismatch = RED_FLAGS.filter(k => s3[k] !== ANSWERS[k]);
  const yes = RED_FLAGS.filter(k => ANSWERS[k]);
  console.log('\n>>> gravadas iguais as respostas do paciente:', mismatch.length === 0 ? 'SIM (12/12)' : 'NAO -> ' + mismatch.join(','));
  console.log('>>> "Sim" que tinham de virar true:', yes.join(', '));
  console.log('>>> todos gravados como true?', yes.every(k => s3[k] === true) ? 'SIM' : 'NAO');
  console.log('>>> consentGiven:', s3.consentGiven, '| smoker:', s3.smoker, `(tipo ${typeof s3.smoker})`);
  console.log('>>> isSubmitted:', s3.isSubmitted, '| isLocked:', s3.isLocked, '| filledBy:', s3.filledBy);
  await p.$disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
