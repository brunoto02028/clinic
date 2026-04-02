const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanImageUrls() {
  console.log("🔍 Verificando URLs de imagens no banco de dados...\n");

  try {
    // Buscar configurações do site
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada");
      return;
    }

    console.log("📊 URLs de imagens atuais:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Logo URL: ${settings.logoUrl || "(vazio)"}`);
    console.log(`Dark Logo URL: ${settings.darkLogoUrl || "(vazio)"}`);
    console.log(`Hero Image URL: ${settings.heroImageUrl || "(vazio)"}`);
    console.log(`Insoles Image URL: ${settings.insolesImageUrl || "(vazio)"}`);
    console.log(`Bio Image URL: ${settings.bioImageUrl || "(vazio)"}`);
    console.log(`Thermo Image URL: ${settings.thermoImageUrl || "(vazio)"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Verificar se há URLs que precisam ser limpas
    const needsCleaning = 
      settings.heroImageUrl || 
      settings.insolesImageUrl || 
      settings.bioImageUrl || 
      settings.thermoImageUrl;

    if (needsCleaning) {
      console.log("🧹 Limpando URLs de imagens antigas...");
      
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          heroImageUrl: null,
          insolesImageUrl: null,
          bioImageUrl: null,
          thermoImageUrl: null,
        },
      });

      console.log("✅ URLs de imagens limpas com sucesso!");
      console.log("ℹ️  O site agora usará imagens placeholder do Unsplash automaticamente\n");
    } else {
      console.log("✅ Nenhuma URL de imagem antiga encontrada. Tudo limpo!\n");
    }

    // Verificar imagens na biblioteca
    const imageLibrary = await prisma.imageLibrary.findMany({
      select: {
        id: true,
        fileName: true,
        imageUrl: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (imageLibrary.length > 0) {
      console.log("📚 Últimas 10 imagens na biblioteca:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      imageLibrary.forEach((img, i) => {
        console.log(`${i + 1}. ${img.fileName}`);
        console.log(`   URL: ${img.imageUrl}`);
        console.log(`   Categoria: ${img.category || "sem categoria"}`);
        console.log(`   Data: ${img.createdAt.toLocaleDateString()}`);
        console.log("");
      });
    } else {
      console.log("📚 Nenhuma imagem na biblioteca ainda\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Verificação concluída!");
    console.log("\n💡 Próximos passos:");
    console.log("   1. As imagens da home agora usarão placeholders do Unsplash");
    console.log("   2. Faça upload de suas próprias imagens via Admin → Settings");
    console.log("   3. As imagens ficarão armazenadas em /public/uploads/");

  } catch (error) {
    console.error("❌ Erro ao limpar URLs:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanImageUrls();
