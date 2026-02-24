const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin123!', 12);

  const clinic = await prisma.clinic.create({
    data: {
      name: 'Bruno Physical Rehabilitation',
      slug: 'bruno-physical-rehabilitation',
      email: 'admin@bpr.rehab',
      phone: '+44 7425199947',
      country: 'UK',
      city: 'London',
      isActive: true,
    },
  });
  console.log('Clinic created:', clinic.id, clinic.name);

  const user = await prisma.user.create({
    data: {
      email: 'admin@bpr.rehab',
      password: hashedPassword,
      firstName: 'Bruno',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true,
      emailVerified: new Date(),
      clinicId: clinic.id,
    },
  });
  console.log('User created:', user.id, user.email, user.role);
  console.log('Login: admin@bpr.rehab / Admin123!');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
