const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixHomeFinal() {
  console.log("🔧 CORREÇÃO FINAL DA HOME\n");

  try {
    const settings = await prisma.siteSettings.findFirst();
    
    // Buscar logo correto na biblioteca
    const logoImage = await prisma.imageLibrary.findFirst({
      where: {
        fileName: { contains: 'Novo_logo_Bruno2' }
      }
    });

    // Buscar imagens do MLS que existem
    const allImages = await prisma.imageLibrary.findMany();
    
    console.log("📚 IMAGENS NA BIBLIOTECA:");
    allImages.forEach(img => {
      console.log(`   - ${img.fileName}: ${img.imageUrl.substring(0, 60)}...`);
    });

    // Usar imagens que realmente existem
    const mlsDevice = allImages.find(img => 
      img.fileName.includes('Mphi75') && !img.fileName.includes('handpiece')
    );
    const mlsTreatment = allImages.find(img => 
      img.fileName.includes('handpiece') || img.fileName.includes('use')
    );

    // Se não encontrar, usar imagens geradas dos artigos
    const articleImages = allImages.filter(img => 
      img.fileName.includes('article-cover') || img.fileName.includes('rehabilitation')
    );

    const mlsLaser = {
      title: "MLS Laser Therapy",
      subtitle: "Advanced Pain Relief Technology",
      description: "Experience the power of Multiwave Locked System laser therapy for rapid pain relief and tissue healing.",
      deviceImageUrl: mlsDevice?.imageUrl || articleImages[0]?.imageUrl || null,
      treatmentImageUrl: mlsTreatment?.imageUrl || articleImages[1]?.imageUrl || null,
      benefits: [
        "Reduces pain and inflammation",
        "Accelerates tissue healing",
        "Non-invasive treatment",
        "No side effects"
      ]
    };

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: logoImage?.imageUrl || null,
        darkLogoUrl: logoImage?.imageUrl || null,
        mlsLaserJson: JSON.stringify(mlsLaser),
        screenLogos: {
          landingHeader: {
            logoUrl: logoImage?.imageUrl || null,
            darkLogoUrl: logoImage?.imageUrl || null,
          },
          landingFooter: {
            logoUrl: logoImage?.imageUrl || null,
            darkLogoUrl: logoImage?.imageUrl || null,
          },
        },
      },
    });

    console.log("\n✅ ATUALIZADO!");
    console.log(`   Logo: ${logoImage?.imageUrl || 'NENHUM'}`);
    console.log(`   MLS Device: ${mlsLaser.deviceImageUrl || 'NENHUM'}`);
    console.log(`   MLS Treatment: ${mlsLaser.treatmentImageUrl || 'NENHUM'}`);
    console.log("\n🌐 Recarregue https://bpr.rehab\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixHomeFinal();
