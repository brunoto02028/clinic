const { PrismaClient } = require('@prisma/client');
const { api, RED_FLAGS, TEXT_AT_RISK, pick } = require('./lib');
const p = new PrismaClient();
const PA = 'cmucgsghc0002xz4w082nmb9y';

// Exactly the shape the web form posts: every field present, red flags a
// deliberate MIX of true and false so that both "Yes" and an explicit "No"
// have to survive.
const WEB_PAYLOAD = {
  unexplainedWeightLoss: true, nightPain: true, traumaHistory: false,
  neurologicalSymptoms: true, bladderBowelDysfunction: false, recentInfection: false,
  cancerHistory: true, steroidUse: false, osteoporosisRisk: true,
  cardiovascularSymptoms: false, severeHeadache: false, dizzinessBalanceIssues: true,
  redFlagDetails: { nightPain: 'acorda 3x por noite' },
  chiefComplaint: 'Dor lombar WEB', painLocation: 'Lombar', painDuration: '6 meses',
  painScore: 7, painType: 'Aguda', painAggravating: 'Sentar', painRelieving: 'Andar',
  painPattern: 'PIOR DE MANHA - VALOR DA WEB',
  functionalLimitations: 'Nao consigo agachar',
  sleepAffected: true, workAffected: false, mobilityAffected: true,
  occupation: 'Contadora WEB', dominantSide: 'Right', dominantFootSide: 'Right',
  activityLevel: 'Sedentary', hobbiesSports: 'Natacao',
  smoker: false, alcoholUse: 'SOCIAL - 2 TACAS SEMANA - VALOR DA WEB',
  height: '168', weight: '64',
  previousPhysio: true, previousPhysioDetails: 'Em 2023',
  previousInjections: false, previousInjectionsDetails: '',
  currentlyUnderCare: false, currentlyUnderCareDetails: '',
  treatmentGoals: 'Voltar a nadar', returnToSport: true, returnToWork: false,
  currentMedications: 'Ibuprofeno', allergies: 'Penicilina',
  surgicalHistory: 'Nenhuma', otherConditions: 'Nenhuma',
  gpDetails: 'DR SMITH - RIVERSIDE SURGERY - VALOR DA WEB',
  emergencyContact: 'JOAO WEB CONTATO', emergencyContactPhone: '+44 7700 900111',
  consentGiven: true,
};

const snap = async () => p.medicalScreening.findUnique({ where: { userId: PA } });
const show = (label, s) => {
  console.log(`\n--- ${label} ---`);
  console.log('red flags :', JSON.stringify(pick(s, RED_FLAGS)));
  console.log('texts     :', JSON.stringify(pick(s, TEXT_AT_RISK), null, 1));
  console.log('consent   :', s && s.consentGiven, '| occupation:', s && s.occupation, '| isLocked:', s && s.isLocked);
};

(async () => {
  await p.medicalScreening.deleteMany({ where: { userId: PA } });
  console.log('== PASSO 1: salvar pela WEB (payload completo do formulario web) ==');
  const r1 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify(WEB_PAYLOAD) });
  console.log('HTTP', r1.status, r1.body.message || JSON.stringify(r1.body).slice(0, 200));
  const afterWeb = await snap();
  show('BANCO apos salvar pela WEB', afterWeb);

  console.log('\n== PASSO 2: app abre a triagem (GET, como screening.tsx faz) ==');
  const g = await api('pa', '/api/medical-screening');
  const pref = g.body.screening;
  console.log('GET HTTP', g.status, '| red flags devolvidas ao app:', JSON.stringify(pick(pref, RED_FLAGS)));

  console.log('\n== PASSO 3a: autosave REAL do app (form prefilled + edicao da etapa 0) ==');
  const appForm = { ...pref, occupation: 'Contadora EDITADA NO APP' };
  const r3 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ ...appForm, _autosave: true }) });
  console.log('HTTP', r3.status, JSON.stringify(r3.body));
  show('BANCO apos autosave real do app', await snap());

  console.log('\n== PASSO 3b: autosave PARCIAL (so occupation) — testa o presentScreeningFields direto ==');
  const r4 = await api('pa', '/api/medical-screening', { method: 'POST', body: JSON.stringify({ occupation: 'PARCIAL', _autosave: true }) });
  console.log('HTTP', r4.status, JSON.stringify(r4.body));
  const final = await snap();
  show('BANCO apos autosave parcial', final);

  // Verdict
  const rfOk = RED_FLAGS.every(k => final[k] === WEB_PAYLOAD[k]);
  const txtOk = TEXT_AT_RISK.every(k => final[k] === WEB_PAYLOAD[k]);
  console.log('\n>>> RED FLAGS preservadas:', rfOk ? 'SIM' : 'NAO');
  if (!rfOk) RED_FLAGS.filter(k => final[k] !== WEB_PAYLOAD[k]).forEach(k => console.log('   PERDIDO', k, WEB_PAYLOAD[k], '->', final[k]));
  console.log('>>> TEXTOS preservados :', txtOk ? 'SIM' : 'NAO');
  if (!txtOk) TEXT_AT_RISK.filter(k => final[k] !== WEB_PAYLOAD[k]).forEach(k => console.log('   PERDIDO', k, JSON.stringify(WEB_PAYLOAD[k]), '->', JSON.stringify(final[k])));
  console.log('>>> occupation final   :', final.occupation, '(esperado PARCIAL — a edicao do app deve valer)');
  await p.$disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
