const fs = require("fs");
const d = JSON.parse(fs.readFileSync("/root/clinic/.next/routes-manifest.json", "utf8"));
console.log("i18n:", JSON.stringify(d.i18n, null, 2));
console.log("redirects count:", d.redirects?.length);
console.log("rewrites:", JSON.stringify(d.rewrites, null, 2)?.substring(0, 500));
