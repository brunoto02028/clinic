const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // Get the API key from system config
  const config = await p.systemConfig.findUnique({ where: { key: "GEMINI_API_KEY" } });
  if (!config) { console.log("No GEMINI_API_KEY found"); process.exit(1); }
  const apiKey = config.value;
  console.log("API Key found:", apiKey.slice(0, 8) + "...");

  // List available models
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  
  if (data.error) {
    console.error("API Error:", data.error.message);
    process.exit(1);
  }

  const models = data.models || [];
  console.log("\nAll models with image generation support:");
  for (const m of models) {
    const methods = m.supportedGenerationMethods || [];
    if (m.name.includes("imagen") || m.name.includes("image") || methods.includes("predict")) {
      console.log(`  ${m.name} - methods: ${methods.join(", ")}`);
    }
  }

  console.log("\nAll Gemini models:");
  for (const m of models) {
    if (m.name.includes("gemini")) {
      const methods = m.supportedGenerationMethods || [];
      console.log(`  ${m.name} - methods: ${methods.join(", ")}`);
    }
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
