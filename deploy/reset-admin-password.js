const { PrismaClient } = require('/root/clinic/node_modules/@prisma/client');
const bcrypt = require('/root/clinic/node_modules/bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Bruno@Admin2026!';
  const hash = await bcrypt.hash(newPassword, 12);

  const result = await prisma.user.updateMany({
    where: { email: 'admin@bpr.rehab' },
    data: { password: hash }
  });
  console.log('Password reset for users:', result.count);

  const user = await prisma.user.findUnique({
    where: { email: 'admin@bpr.rehab' },
    select: { id: true, email: true, role: true, firstName: true, isActive: true }
  });
  console.log('User:', JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
