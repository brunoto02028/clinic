const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.findFirst({
  where: { email: "maria.santos.demo@example.com" },
  select: { id: true, email: true, clinicId: true }
}).then(r => {
  console.log("Patient:", JSON.stringify(r));
  p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
