const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.siteSettings.findFirst()
  .then(d => { console.log("DB OK, settings:", d ? "found" : "none"); process.exit(0); })
  .catch(e => { console.error("DB FAIL:", e.message); process.exit(1); });
