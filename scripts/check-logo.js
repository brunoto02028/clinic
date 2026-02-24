const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const s = await p.siteSettings.findFirst({
    select: { logoUrl: true, darkLogoUrl: true, screenLogos: true }
  });
  console.log(JSON.stringify(s, null, 2));
  await p.$disconnect();
})();
