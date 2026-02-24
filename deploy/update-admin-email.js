const { PrismaClient } = require('/root/clinic/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      email: { contains: 'brunophysicalrehabilitation' },
      role: { in: ['ADMIN', 'SUPERADMIN'] }
    },
    data: { email: 'admin@bpr.rehab' }
  });
  console.log('Updated admin users:', result.count);

  // Also update clinic email
  const clinic = await prisma.clinic.updateMany({
    where: { email: { contains: 'brunophysicalrehabilitation' } },
    data: { email: 'admin@bpr.rehab' }
  });
  console.log('Updated clinic records:', clinic.count);

  // Show current admin users
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: { id: true, email: true, role: true, firstName: true, lastName: true }
  });
  console.log('Current admin users:', JSON.stringify(admins, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
