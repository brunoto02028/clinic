const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const u = await p.user.findFirst({
    where: { email: "maria.santos.demo@example.com" },
    select: { id: true, fullAccessOverride: true, moduleOverrides: true }
  });
  console.log("User:", JSON.stringify(u, null, 2));

  if (u) {
    const s = await p.medicalScreening.findFirst({
      where: { userId: u.id },
      select: { id: true, isSubmitted: true, isLocked: true }
    });
    console.log("Screening:", JSON.stringify(s, null, 2));
  }

  await p.$disconnect();
})();
