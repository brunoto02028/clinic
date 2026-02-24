const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const u = await p.user.findFirst({ where: { role: 'SUPERADMIN' } });
  if (!u) {
    console.log('NO SUPERADMIN FOUND');
    return;
  }
  console.log('id:', u.id);
  console.log('email:', u.email);
  console.log('role:', u.role);
  console.log('isActive:', u.isActive);
  console.log('emailVerified:', u.emailVerified);
  console.log('password starts with:', u.password?.substring(0, 10));
  
  const match = await bcrypt.compare('Admin123!', u.password);
  console.log('Password Admin123! matches:', match);
  
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
