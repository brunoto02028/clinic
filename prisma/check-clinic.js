const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

Promise.all([
  p.user.findFirst({ where: { role: "SUPERADMIN" }, select: { id: true, email: true, clinicId: true } }),
  p.marketplaceProduct.findFirst({ select: { id: true, name: true, clinicId: true } }),
  p.clinic.findMany({ select: { id: true, name: true } }),
]).then(([admin, product, clinics]) => {
  console.log("Admin user:", JSON.stringify(admin));
  console.log("First product:", JSON.stringify(product));
  console.log("Clinics:", JSON.stringify(clinics));
  p.$disconnect();
}).catch(e => { console.error(e); p.$disconnect(); });
