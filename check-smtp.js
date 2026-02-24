const { PrismaClient } = require("./node_modules/@prisma/client");
const p = new PrismaClient();
(async () => {
  const r = await p.systemConfig.findMany({
    where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM", "RESEND_API_KEY"] } },
  });
  console.log("SMTP Config:", JSON.stringify(r, null, 2));

  // Check email templates count
  const templates = await p.emailTemplate.findMany({ select: { slug: true, isActive: true } });
  console.log("Templates:", JSON.stringify(templates, null, 2));

  // Check if communicationPreference field exists on User
  const sampleUser = await p.user.findFirst({ where: { role: "PATIENT" }, select: { id: true, email: true, phone: true, firstName: true } });
  console.log("Sample patient:", JSON.stringify(sampleUser, null, 2));

  // Check WhatsApp messages
  try {
    const waCount = await p.whatsAppMessage.count();
    console.log("WhatsApp messages:", waCount);
  } catch (e) {
    console.log("WhatsApp table check:", e.message?.substring(0, 80));
  }

  await p.$disconnect();
})();
