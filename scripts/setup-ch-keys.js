const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const keys = [
    { key: "COMPANIES_HOUSE_API_KEY", value: "9c19155c-3814-4783-98cf-cb3c221d06a6", label: "Companies House REST API Key" },
    { key: "COMPANIES_HOUSE_OAUTH_CLIENT_ID", value: "b2567458-28ae-47cc-9f41-90bcc31f6ef9", label: "Companies House OAuth Client ID" },
    { key: "COMPANIES_HOUSE_OAUTH_CLIENT_SECRET", value: "AZhi2JsY9Ns2r3z2e9CgPcezIaeGlk1mrbJOTmbxfUs", label: "Companies House OAuth Client Secret" },
    { key: "COMPANIES_HOUSE_OAUTH_REDIRECT_URI", value: "https://bpr.rehab/api/government/callback/companies-house", label: "Companies House OAuth Redirect URI" },
  ];

  for (const { key, value, label } of keys) {
    const existing = await p.systemConfig.findUnique({ where: { key } });
    if (existing) {
      await p.systemConfig.update({ where: { key }, data: { value } });
      console.log(`Updated: ${key}`);
    } else {
      await p.systemConfig.create({ data: { key, value, label } });
      console.log(`Created: ${key}`);
    }
  }

  // Verify
  const all = await p.systemConfig.findMany({
    where: { key: { startsWith: "COMPANIES_HOUSE" } },
    select: { key: true, value: true },
  });
  console.log("\nStored CH keys:");
  all.forEach((c) => console.log(`  ${c.key} = ${c.value.substring(0, 12)}...`));

  await p.$disconnect();
})();
