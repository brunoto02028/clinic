const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deleteAllLibraryImages() {
  console.log("🗑️  DELETANDO TODAS AS IMAGENS DA BIBLIOTECA\n");

  try {
    // Contar imagens antes
    const count = await prisma.imageLibrary.count();
    console.log(`📊 Total de imagens na biblioteca: ${count}\n`);

    if (count === 0) {
      console.log("✅ Nenhuma imagem para deletar");
      return;
    }

    // Listar todas antes de deletar
    const images = await prisma.imageLibrary.findMany({
      select: {
        id: true,
        fileName: true,
        imageUrl: true,
      },
    });

    console.log("📋 Imagens que serão deletadas:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.fileName}`);
      console.log(`   URL: ${img.imageUrl}`);
    });

    console.log("\n🗑️  Deletando...");
    
    // Deletar todas
    const result = await prisma.imageLibrary.deleteMany({});
    
    console.log(`\n✅ ${result.count} imagens deletadas da biblioteca com sucesso!`);
    console.log("\n💡 Nota: Os arquivos físicos em /public/uploads/ NÃO foram deletados.");
    console.log("   Se quiser deletar os arquivos físicos também, use:");
    console.log("   rm -rf public/uploads/*");

  } catch (error) {
    console.error("❌ Erro ao deletar imagens:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllLibraryImages();
