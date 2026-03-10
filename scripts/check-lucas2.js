const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const u = await p.user.findFirst({
    where: { email: "lucas.luzz@outlook.com" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      consentAcceptedAt: true,
      profileCompleted: true,
      clinicId: true,
    },
  });
  console.log("Lucas:", JSON.stringify(u, null, 2));

  // Also check if User model has gender field
  const cols = await p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'gender'`;
  console.log("Gender column exists:", JSON.stringify(cols));

  await p.$disconnect();
})();
