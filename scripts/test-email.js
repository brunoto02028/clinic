const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || "default-clinic-secret-key-32ch!";
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
  } catch { return encrypted; }
}

const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Check config
    const configs = await prisma.systemConfig.findMany({ where: { category: "email" } });
    console.log("=== EMAIL CONFIGURATION ===");
    const cfg = {};
    configs.forEach(c => {
      const raw = c.isSecret && c.value ? decryptValue(c.value) : c.value;
      const display = c.isSecret ? (c.value ? "*** SET ***" : "NOT SET") : (c.value || "NOT SET");
      console.log(`${c.key}: ${display} (active: ${c.isActive})`);
      cfg[c.key] = raw;
    });

    // 2. Test SMTP connection
    const host = cfg.SMTP_HOST;
    const port = parseInt(cfg.SMTP_PORT || "465", 10);
    const user = cfg.SMTP_USER;
    const pass = cfg.SMTP_PASS;
    const from = cfg.EMAIL_FROM || user;

    if (!host || !user || !pass) {
      console.log("\n❌ SMTP not fully configured. Missing: " + 
        (!host ? "SMTP_HOST " : "") + (!user ? "SMTP_USER " : "") + (!pass ? "SMTP_PASS" : ""));
      return;
    }

    console.log(`\n=== TESTING SMTP: ${host}:${port} as ${user} ===`);
    const transporter = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    // Verify connection
    await transporter.verify();
    console.log("✅ SMTP connection verified!");

    // 3. Send test email
    const info = await transporter.sendMail({
      from: from,
      to: "brunotoaz@gmail.com",
      subject: "✅ Bruno Rehab - Email Test",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #5dc9c0; border-radius: 10px;">
          <h2 style="color: #607d7d;">Bruno Physical Rehabilitation</h2>
          <p>This is a test email from your clinic system.</p>
          <p style="color: #5dc9c0; font-weight: bold;">✅ Email service is working correctly!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Sent via Hostinger SMTP at ${new Date().toISOString()}</p>
        </div>
      `,
    });
    console.log("✅ Test email sent! MessageId:", info.messageId);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
