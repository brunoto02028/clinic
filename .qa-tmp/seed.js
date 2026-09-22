const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
const PW = 'QaTest!2026';
const TAG = 'qa069';

async function mkUser(email, first, last, clinicId) {
  const hash = await bcrypt.hash(PW, 10);
  return p.user.upsert({
    where: { email },
    update: { clinicId, password: hash, isActive: true, role: 'PATIENT', emailVerified: new Date() },
    create: { email, firstName: first, lastName: last, clinicId, password: hash, role: 'PATIENT', isActive: true, emailVerified: new Date() },
  });
}

(async () => {
  // A clinic whose name is unmistakably NOT "Ipswich clinic" — for C9.
  const clinicB = await p.clinic.upsert({
    where: { slug: 'qa069-norwich' },
    update: { name: 'QA069 Norwich Movement Centre' },
    create: { name: 'QA069 Norwich Movement Centre', slug: 'qa069-norwich', type: 'CLINIC' },
  });
  const clinicA = await p.clinic.findFirst({ where: { slug: 'qa-clinic-a' } });

  const users = {};
  users.PA = await mkUser(`pa.${TAG}@example.com`, 'Paula', 'Web', clinicA.id);       // C1 web-then-app
  users.PB = await mkUser(`pb.${TAG}@example.com`, 'Bruna', 'App', clinicA.id);       // C2/C3/C4 app submit
  users.PC = await mkUser(`pc.${TAG}@example.com`, 'Carla', 'NoConsent', clinicA.id); // C5 not accepted
  users.PE = await mkUser(`pe.${TAG}@example.com`, 'Elena', 'Norwich', clinicB.id);   // C9 other clinic
  users.PF = await mkUser(`pf.${TAG}@example.com`, 'Flavia', 'Fresh', clinicA.id);    // fresh, no screening (create path)

  console.log(JSON.stringify({
    clinicA: { id: clinicA.id, name: clinicA.name },
    clinicB: { id: clinicB.id, name: clinicB.name },
    users: Object.fromEntries(Object.entries(users).map(([k, u]) => [k, { id: u.id, email: u.email, clinicId: u.clinicId }])),
    password: PW,
  }, null, 2));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e); process.exit(1); });
