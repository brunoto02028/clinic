const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para atualizar logo em TODAS as páginas do site
 * Execute após fazer upload do logo via admin/media
 */

async function updateLogoEverywhere() {
  console.log("🔄 ATUALIZANDO LOGO EM TODAS AS PÁGINAS\n");

  try {
    // 1. Buscar o logo mais recente na biblioteca (categoria "logo" ou nome contém "logo")
    console.log("1️⃣ Buscando logo mais recente...");
    
    const logo = await prisma.imageLibrary.findFirst({
      where: {
        OR: [
          { category: "logo" },
          { fileName: { contains: "logo", mode: "insensitive" } },
          { originalName: { contains: "logo", mode: "insensitive" } },
        ]
      },
      orderBy: { createdAt: "desc" },
    });

    if (!logo) {
      console.log("❌ Nenhum logo encontrado na biblioteca!");
      console.log("   Por favor, faça upload do logo primeiro em /admin/media\n");
      return;
    }

    console.log(`✅ Logo encontrado: ${logo.originalName}`);
    console.log(`   URL: ${logo.imageUrl}\n`);

    // 2. Atualizar configurações do site
    console.log("2️⃣ Atualizando configurações...");
    
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Configurações não encontradas!");
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: logo.imageUrl,
        darkLogoUrl: logo.imageUrl,
        screenLogos: {
          // Landing Page
          landingHeader: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          landingFooter: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          // Admin
          adminHeader: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          adminLogin: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          // Patient Portal
          login: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          signup: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          dashboard: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
          forgotPassword: {
            logoUrl: logo.imageUrl,
            darkLogoUrl: logo.imageUrl,
          },
        },
      },
    });

    console.log("✅ Logo atualizado em TODAS as páginas:\n");
    console.log("   ✓ Landing Page (Header)");
    console.log("   ✓ Landing Page (Footer)");
    console.log("   ✓ Admin Header");
    console.log("   ✓ Admin Login");
    console.log("   ✓ Patient Login");
    console.log("   ✓ Patient Signup");
    console.log("   ✓ Patient Dashboard");
    console.log("   ✓ Forgot Password\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ CONCLUÍDO!\n");
    console.log(`   Logo: ${logo.imageUrl}\n`);
    console.log("🌐 Recarregue o site (Ctrl+Shift+R) para ver o logo correto");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLogoEverywhere();
