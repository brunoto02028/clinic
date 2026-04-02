const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixAllHomeIssues() {
  console.log("🔧 CORRIGINDO TODOS OS PROBLEMAS DA HOME\n");

  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada!");
      return;
    }

    // Parse MLS Laser JSON
    let mlsLaser = {};
    try {
      mlsLaser = JSON.parse(settings.mlsLaserJson || '{}');
    } catch {}

    console.log("📋 PROBLEMAS IDENTIFICADOS:");
    console.log(`   1. Logo: ${settings.logoUrl}`);
    console.log(`   2. MLS treatmentImageUrl: ${mlsLaser.treatmentImageUrl || 'VAZIO'}`);
    console.log(`   3. MLS deviceImageUrl: ${mlsLaser.deviceImageUrl || 'VAZIO'}`);
    console.log(`   4. Thermography: ${settings.thermoImageUrl || 'VAZIO'}`);

    // Usar logo que existe na biblioteca
    const logoImage = await prisma.imageLibrary.findFirst({
      where: {
        fileName: {
          contains: 'Novo_logo_Bruno2'
        }
      }
    });

    const logoUrl = logoImage?.imageUrl || null;

    // Buscar imagens do MLS Laser na biblioteca
    const mlsImages = await prisma.imageLibrary.findMany({
      where: {
        OR: [
          { fileName: { contains: 'Mphi75' } },
          { fileName: { contains: 'laser' } }
        ]
      }
    });

    const deviceImage = mlsImages.find(img => img.fileName.includes('Mphi75.jpg'));
    const treatmentImage = mlsImages.find(img => img.fileName.includes('handpiece') || img.fileName.includes('use'));

    // Atualizar MLS Laser JSON
    const updatedMlsLaser = {
      ...mlsLaser,
      deviceImageUrl: deviceImage?.imageUrl || mlsLaser.deviceImageUrl,
      treatmentImageUrl: treatmentImage?.imageUrl || mlsLaser.treatmentImageUrl,
    };

    console.log("\n🔄 APLICANDO CORREÇÕES...\n");

    const updated = await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: logoUrl,
        darkLogoUrl: logoUrl,
        mlsLaserJson: JSON.stringify(updatedMlsLaser),
        screenLogos: {
          landingHeader: {
            logoUrl: logoUrl,
            darkLogoUrl: logoUrl,
          },
          landingFooter: {
            logoUrl: logoUrl,
            darkLogoUrl: logoUrl,
          },
        },
      },
    });

    console.log("✅ CORREÇÕES APLICADAS!\n");
    console.log("📋 NOVA CONFIGURAÇÃO:");
    console.log(`   Logo: ${updated.logoUrl}`);
    
    const newMls = JSON.parse(updated.mlsLaserJson || '{}');
    console.log(`   MLS treatmentImageUrl: ${newMls.treatmentImageUrl || 'VAZIO'}`);
    console.log(`   MLS deviceImageUrl: ${newMls.deviceImageUrl || 'VAZIO'}`);

    console.log("\n✅ CONCLUÍDO!");
    console.log("🌐 Recarregue https://bpr.rehab para ver as mudanças\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllHomeIssues();
