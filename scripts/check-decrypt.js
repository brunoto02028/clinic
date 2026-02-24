const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const p = new PrismaClient();

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.SECRET_KEY || "default-clinic-secret-key-32ch!";
const ALGORITHM = "aes-256-cbc";

function getKey() {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
}

function decryptValue(encrypted) {
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return { raw: true, value: encrypted };
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return { raw: false, value: decrypted };
  } catch (err) {
    return { raw: true, value: encrypted, error: err.message };
  }
}

(async () => {
  console.log("NEXTAUTH_SECRET:", ENCRYPTION_KEY ? ENCRYPTION_KEY.substring(0, 10) + "..." : "NOT SET");
  
  const keys = ["ABACUS_API_KEY", "GEMINI_API_KEY"];
  for (const key of keys) {
    const config = await p.systemConfig.findUnique({ where: { key } });
    if (!config) { console.log(`${key}: NOT FOUND`); continue; }
    
    console.log(`\n${key}:`);
    console.log(`  stored value (first 30): ${config.value.substring(0, 30)}...`);
    console.log(`  isSecret: ${config.isSecret}`);
    console.log(`  has colon (encrypted format): ${config.value.includes(":")}`);
    
    const result = decryptValue(config.value);
    if (result.error) {
      console.log(`  DECRYPT FAILED: ${result.error}`);
      console.log(`  Returning raw value (first 20): ${result.value.substring(0, 20)}...`);
    } else if (result.raw) {
      console.log(`  Not encrypted (no colon), raw value (first 20): ${result.value.substring(0, 20)}...`);
    } else {
      console.log(`  Decrypted OK (first 20): ${result.value.substring(0, 20)}...`);
    }
  }
  
  await p.$disconnect();
})();
