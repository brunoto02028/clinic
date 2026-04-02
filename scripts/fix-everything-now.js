const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixEverything() {
  console.log("🔧 CORRIGINDO TUDO AGORA\n");

  try {
    // 1. Buscar logo que funciona (Novo_logo_Bruno2.png)
    const logoInLibrary = await prisma.imageLibrary.findFirst({
      where: { fileName: { contains: 'Novo_logo_Bruno2' } }
    });

    console.log("📋 Logo encontrado:", logoInLibrary?.imageUrl || 'NENHUM');

    // 2. Atualizar settings com logo correto
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada!");
      return;
    }

    const logoUrl = logoInLibrary?.imageUrl || null;

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: logoUrl,
        darkLogoUrl: logoUrl,
        screenLogos: {
          landingHeader: { logoUrl, darkLogoUrl: logoUrl },
          landingFooter: { logoUrl, darkLogoUrl: logoUrl },
          adminHeader: { logoUrl, darkLogoUrl: logoUrl },
          login: { logoUrl, darkLogoUrl: logoUrl },
          signup: { logoUrl, darkLogoUrl: logoUrl },
          dashboard: { logoUrl, darkLogoUrl: logoUrl },
        },
      },
    });

    console.log("✅ Logo atualizado em TODAS as telas");
    console.log(`   URL: ${logoUrl}\n`);

    // 3. Verificar imagens quebradas
    const brokenImages = await prisma.imageLibrary.findMany({
      where: {
        OR: [
          { imageUrl: { startsWith: '/uploads/' } },
          { imageUrl: null }
        ]
      }
    });

    console.log(`📊 Imagens quebradas: ${brokenImages.length}`);
    
    if (brokenImages.length > 0) {
      console.log("   Deletando imagens quebradas...");
      await prisma.imageLibrary.deleteMany({
        where: {
          OR: [
            { imageUrl: { startsWith: '/uploads/' } },
            { imageUrl: null }
          ]
        }
      });
      console.log("   ✅ Imagens quebradas removidas\n");
    }

    console.log("✅ TUDO CORRIGIDO!");
    console.log("🌐 Recarregue https://bpr.rehab (Ctrl+Shift+R)\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEverything();
