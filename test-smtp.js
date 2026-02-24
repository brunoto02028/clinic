// Test SMTP from VPS — run with: node test-smtp.js
const { PrismaClient } = require("./node_modules/@prisma/client");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || "default-clinic-secret-key-32ch!";
function getKey() { return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest(); }
function decryptValue(encrypted) {
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return encrypted;
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", getKey(), iv);
    let d = decipher.update(encHex, "hex", "utf8");
    d += decipher.final("utf8");
    return d;
  } catch { return encrypted; }
}

(async () => {
  const p = new PrismaClient();
  const configs = await p.systemConfig.findMany({
    where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM"] } },
  });
  const cfg = {};
  for (const c of configs) {
    cfg[c.key] = c.isSecret ? decryptValue(c.value) : c.value;
  }
  console.log("Config:", { host: cfg.SMTP_HOST, port: cfg.SMTP_PORT, user: cfg.SMTP_USER, from: cfg.EMAIL_FROM, passLength: cfg.SMTP_PASS?.length });

  if (!cfg.SMTP_HOST || !cfg.SMTP_USER || !cfg.SMTP_PASS) {
    console.log("SMTP not configured!");
    await p.$disconnect();
    return;
  }

  const transporter = nodemailer.createTransport({
    host: cfg.SMTP_HOST,
    port: parseInt(cfg.SMTP_PORT) || 465,
    secure: (parseInt(cfg.SMTP_PORT) || 465) === 465,
    auth: { user: cfg.SMTP_USER, pass: cfg.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  try {
    const info = await transporter.sendMail({
      from: cfg.EMAIL_FROM || cfg.SMTP_USER,
      to: "brunotoaz@gmail.com",
      subject: "BPR SMTP Test — " + new Date().toISOString(),
      html: "<h2>SMTP Test</h2><p>If you see this, email delivery is working!</p><p>Sent at: " + new Date().toLocaleString("en-GB") + "</p>",
    });
    console.log("SUCCESS! Message sent:", info.messageId);
  } catch (err) {
    console.error("SMTP FAILED:", err.message);
    console.error("Full error:", err);
  }
  await p.$disconnect();
})();
