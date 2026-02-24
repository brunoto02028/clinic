const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.siteSettings.findFirst({
  select: { logoUrl: true, darkLogoUrl: true, logoPath: true, darkLogoPath: true }
}).then(s => {
  console.log(JSON.stringify(s, null, 2));
  p.$disconnect();
});
