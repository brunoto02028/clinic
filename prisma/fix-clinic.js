const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.marketplaceProduct.updateMany({
  where: { clinicId: "cmlnm7mpl0000xzkclm5u0wto" },
  data: { clinicId: "cmlk1dsn80000l6ui71xh5ky9" }
}).then(r => {
  console.log("Updated products:", r.count);
  p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
