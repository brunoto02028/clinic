const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.marketplaceProduct.count().then(c => {
  console.log("Products count:", c);
  return p.marketplaceProduct.findMany({ select: { id: true, name: true, isActive: true, isAffiliate: true }, take: 5 });
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
