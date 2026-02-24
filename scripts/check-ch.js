const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const clinic = await p.clinic.findFirst();
  if (!clinic) { console.log("No clinic"); return; }
  const cp = await p.companyProfile.findUnique({ where: { clinicId: clinic.id } });
  if (!cp) { console.log("No company profile"); return; }
  console.log("companyName:", cp.companyName);
  console.log("companyNumber:", cp.companyNumber);
  console.log("companyStatus:", cp.companyStatus);
  console.log("sicCodes:", cp.sicCodes);
  console.log("sicDescriptions:", cp.sicDescriptions);
  console.log("dateOfIncorporation:", cp.dateOfIncorporation);
  console.log("regAddressLine1:", cp.regAddressLine1);
  console.log("regAddressCity:", cp.regAddressCity);
  console.log("regAddressPostcode:", cp.regAddressPostcode);
  console.log("taxYearEnd:", cp.taxYearEnd);

  const key = await p.systemConfig.findUnique({ where: { key: "COMPANIES_HOUSE_API_KEY" } });
  console.log("\nAPI Key:", key ? key.value.substring(0, 12) + "..." : "NOT FOUND");

  await p.$disconnect();
})();
