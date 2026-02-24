const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const correctLogoUrl = "/uploads/1771399315768-Novo_logo_Bruno2.png";
  
  // Update all screenLogos to use the correct file that actually exists
  const screenLogos = {
    login: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
    signup: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
    dashboard: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
    adminLogin: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
    landingFooter: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
    landingHeader: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
    forgotPassword: { logoUrl: correctLogoUrl, darkLogoUrl: "" },
  };

  const s = await p.siteSettings.findFirst();
  if (s) {
    await p.siteSettings.update({
      where: { id: s.id },
      data: { screenLogos, logoUrl: correctLogoUrl },
    });
    console.log("✅ All screen logos updated to:", correctLogoUrl);
  } else {
    console.log("❌ No SiteSettings found");
  }
  await p.$disconnect();
})();
