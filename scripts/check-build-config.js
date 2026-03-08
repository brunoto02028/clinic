const fs = require("fs");
// Check required-server-files for cached i18n config
try {
  const rsf = JSON.parse(fs.readFileSync("/root/clinic/.next/required-server-files.json", "utf8"));
  console.log("i18n in config:", JSON.stringify(rsf.config?.i18n, null, 2));
  console.log("Has locales:", !!rsf.config?.i18n?.locales);
} catch(e) {
  console.log("No required-server-files.json:", e.message);
}

// Check prerender-manifest
try {
  const pm = JSON.parse(fs.readFileSync("/root/clinic/.next/prerender-manifest.json", "utf8"));
  console.log("preview keys:", Object.keys(pm).join(", "));
} catch(e) {
  console.log("No prerender-manifest:", e.message);
}

// Check next-server config
try {
  const sc = JSON.parse(fs.readFileSync("/root/clinic/.next/server/pages-manifest.json", "utf8"));
  const keys = Object.keys(sc).slice(0, 10);
  console.log("Pages manifest sample:", keys);
  const hasEn = keys.some(k => k.startsWith("/en"));
  console.log("Has /en/ prefixed pages:", hasEn);
} catch(e) {
  console.log("No pages-manifest:", e.message);
}

// Try to find what sets NEXT_LOCALE
const serverFiles = [
  "/root/clinic/.next/server/middleware.js",
];
for (const f of serverFiles) {
  try {
    const content = fs.readFileSync(f, "utf8");
    if (content.includes("NEXT_LOCALE")) {
      console.log(f, "contains NEXT_LOCALE");
      // Find context around it
      const idx = content.indexOf("NEXT_LOCALE");
      console.log("Context:", content.substring(Math.max(0, idx - 200), idx + 200));
    }
  } catch(e) {}
}
