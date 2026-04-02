const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para corrigir o logo DEFINITIVAMENTE
 * Remove o texto "BPR ." e garante que o logo correto seja usado
 */

async function fixLogo() {
  console.log("🔧 CORRIGINDO LOGO DEFINITIVAMENTE\n");

  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada!");
      return;
    }

    console.log("📋 CONFIGURAÇÃO ATUAL:");
    console.log(`   logoUrl: ${settings.logoUrl || 'VAZIO'}`);
    console.log(`   darkLogoUrl: ${settings.darkLogoUrl || 'VAZIO'}`);
    console.log(`   siteName: ${settings.siteName || 'VAZIO'}`);
    console.log(`   footerText: ${settings.footerText || 'VAZIO'}`);
    
    if (settings.screenLogos) {
      console.log(`   screenLogos: ${JSON.stringify(settings.screenLogos, null, 2)}`);
    }

    // URLs corretas dos logos (baseado na memória do sistema)
    const CORRECT_LOGO_WHITE = "/logo-white.svg"; // Logo branco completo
    const CORRECT_LOGO_GREEN = "/logo-green.svg"; // Logo verde/sálvia completo
    const CORRECT_FAVICON = "/favicon.svg"; // Favicon com monograma BPR

    console.log("\n🔄 ATUALIZANDO PARA LOGOS CORRETOS...\n");

    const updated = await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: CORRECT_LOGO_WHITE,
        darkLogoUrl: CORRECT_LOGO_GREEN,
        siteName: "Bruno Physical Rehabilitation",
        footerText: `© ${new Date().getFullYear()} Bruno Physical Rehabilitation. All rights reserved.`,
        screenLogos: {
          landingHeader: {
            logoUrl: CORRECT_LOGO_WHITE,
            darkLogoUrl: CORRECT_LOGO_GREEN,
          },
          landingFooter: {
            logoUrl: CORRECT_LOGO_WHITE,
            darkLogoUrl: CORRECT_LOGO_GREEN,
          },
          adminHeader: {
            logoUrl: CORRECT_LOGO_WHITE,
            darkLogoUrl: CORRECT_LOGO_GREEN,
          },
        },
      },
    });

    console.log("✅ LOGO ATUALIZADO COM SUCESSO!\n");
    console.log("📋 NOVA CONFIGURAÇÃO:");
    console.log(`   logoUrl: ${updated.logoUrl}`);
    console.log(`   darkLogoUrl: ${updated.darkLogoUrl}`);
    console.log(`   siteName: ${updated.siteName}`);
    console.log(`   footerText: ${updated.footerText}`);
    console.log(`   screenLogos: ${JSON.stringify(updated.screenLogos, null, 2)}`);

    console.log("\n✅ CONCLUÍDO!");
    console.log("🌐 Acesse https://bpr.rehab para verificar\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLogo();
