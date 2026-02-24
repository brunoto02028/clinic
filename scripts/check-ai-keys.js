const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const keys = ["ABACUS_API_KEY", "GEMINI_API_KEY", "AI_DEFAULT_PROVIDER", "AI_IMAGE_MODEL"];
  for (const key of keys) {
    const config = await p.systemConfig.findUnique({ where: { key } });
    if (config) {
      console.log(`${key}:`);
      console.log(`  value: ${config.value ? config.value.substring(0, 20) + "..." : "EMPTY"}`);
      console.log(`  isActive: ${config.isActive}`);
      console.log(`  isSecret: ${config.isSecret}`);
    } else {
      console.log(`${key}: NOT FOUND in DB`);
    }
  }
  await p.$disconnect();
})();
