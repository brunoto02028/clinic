const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const p = new PrismaClient();

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.SECRET_KEY || "default-clinic-secret-key-32ch!";

function getKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

function decryptValue(encrypted) {
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return encrypted;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv);
    let decrypted = decipher.update(encHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return encrypted;
  }
}

async function getKey2(keyName) {
  const config = await p.systemConfig.findUnique({ where: { key: keyName } });
  if (!config || !config.isActive || !config.value) return null;
  return config.isSecret ? decryptValue(config.value) : config.value;
}

(async () => {
  // Test 1: Abacus Image Generation
  console.log("=== Test 1: Abacus Image Generation ===");
  const abacusKey = await getKey2("ABACUS_API_KEY");
  if (!abacusKey) {
    console.log("ABACUS_API_KEY not found or inactive");
  } else {
    console.log("Abacus key found:", abacusKey.substring(0, 15) + "...");
    try {
      const res = await fetch("https://routellm.abacus.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${abacusKey}`,
        },
        body: JSON.stringify({
          model: "flux-2-pro",
          messages: [{ role: "user", content: "A simple blue circle on white background" }],
          modalities: ["image"],
          image_config: { num_images: 1, aspect_ratio: "1:1" },
        }),
      });
      console.log("Abacus status:", res.status);
      const text = await res.text();
      console.log("Abacus response (first 500):", text.substring(0, 500));
    } catch (err) {
      console.log("Abacus fetch error:", err.message);
    }
  }

  // Test 2: Gemini Image Generation (gemini-2.5-flash via generateContent)
  console.log("\n=== Test 2: Gemini Image Generation ===");
  const geminiKey = await getKey2("GEMINI_API_KEY");
  if (!geminiKey) {
    console.log("GEMINI_API_KEY not found or inactive");
  } else {
    console.log("Gemini key found:", geminiKey.substring(0, 15) + "...");
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Generate a simple image of a blue circle on a white background." }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      console.log("Gemini status:", res.status);
      const text = await res.text();
      console.log("Gemini response (first 500):", text.substring(0, 500));
    } catch (err) {
      console.log("Gemini fetch error:", err.message);
    }
  }

  await p.$disconnect();
})();
