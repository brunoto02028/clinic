const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const lucasId = "cmm4369gj0010l67b00yhi8fr";

  // Check Lucas's membership/subscription
  const memberships = await p.$queryRaw`
    SELECT m.id, m.status, m."startDate", m."endDate", mp.name, mp.price, mp.interval
    FROM "Membership" m
    LEFT JOIN "MembershipPlan" mp ON m."planId" = mp.id
    WHERE m."userId" = ${lucasId}
    ORDER BY m."createdAt" DESC
    LIMIT 5
  `;
  console.log("Lucas memberships:", JSON.stringify(memberships, null, 2));

  // Check if there's a fullAccessOverride config  
  const portalConfig = await p.$queryRaw`
    SELECT key, value FROM "SystemConfig" WHERE key LIKE '%portal%' OR key LIKE '%access%' OR key LIKE '%free%'
  `;
  console.log("\nPortal config:", JSON.stringify(portalConfig, null, 2));

  // Check Lucas's consent
  const lucas = await p.user.findUnique({
    where: { id: lucasId },
    select: { consentAcceptedAt: true, isActive: true, role: true, clinicId: true },
  });
  console.log("\nLucas user:", JSON.stringify(lucas, null, 2));

  await p.$disconnect();
})();
