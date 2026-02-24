const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const API_KEY = "AIzaSyCW9LKxWg_G_mKy24JRMFKLCZv6CD-_yrY";

async function main() {
  // Step 1: Update or create the API key in system config
  const existing = await p.systemConfig.findUnique({ where: { key: "GEMINI_API_KEY" } });
  if (existing) {
    await p.systemConfig.update({ where: { key: "GEMINI_API_KEY" }, data: { value: API_KEY } });
    console.log("Updated GEMINI_API_KEY in system config");
  } else {
    await p.systemConfig.create({ data: { key: "GEMINI_API_KEY", value: API_KEY, description: "Google Gemini API Key" } });
    console.log("Created GEMINI_API_KEY in system config");
  }

  // Step 2: Verify key works - list models
  console.log("\nVerifying API key...");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
  const data = await res.json();
  if (data.error) {
    console.error("API Error:", data.error.message);
    process.exit(1);
  }

  const models = data.models || [];
  console.log("API key valid! Found", models.length, "models\n");

  // Show image-related models
  console.log("Image generation models:");
  for (const m of models) {
    const methods = m.supportedGenerationMethods || [];
    if (m.name.includes("imagen") || m.name.includes("image") || methods.includes("predict")) {
      console.log(`  ${m.name} - methods: ${methods.join(", ")}`);
    }
  }

  // Show Gemini Flash models (which support image gen via responseModalities)
  console.log("\nGemini Flash models:");
  for (const m of models) {
    if (m.name.includes("gemini") && m.name.includes("flash")) {
      const methods = m.supportedGenerationMethods || [];
      console.log(`  ${m.name} - methods: ${methods.join(", ")}`);
    }
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
