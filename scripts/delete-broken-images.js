const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para deletar imagens quebradas (tamanho 0 ou URLs inválidas)
 */

async function deleteBrokenImages() {
  console.log("🗑️  DELETANDO IMAGENS QUEBRADAS\n");

  try {
    // Buscar imagens quebradas
    const brokenImages = await prisma.imageLibrary.findMany({
      where: {
        OR: [
          { fileSize: { equals: 0 } },
          { imageUrl: { startsWith: '/uploads/' } },
        ]
      }
    });

    console.log(`📊 Encontradas ${brokenImages.length} imagens quebradas:\n`);

    if (brokenImages.length === 0) {
      console.log("✅ Nenhuma imagem quebrada encontrada!\n");
      return;
    }

    // Mostrar lista
    brokenImages.forEach((img, i) => {
      console.log(`   ${i + 1}. ${img.originalName} (${img.fileSize || 0} bytes)`);
    });

    console.log("\n🗑️  Deletando...\n");

    // Deletar todas
    const result = await prisma.imageLibrary.deleteMany({
      where: {
        OR: [
          { fileSize: { equals: 0 } },
          { imageUrl: { startsWith: '/uploads/' } },
        ]
      }
    });

    console.log(`✅ ${result.count} imagens quebradas deletadas!\n`);
    console.log("🌐 Recarregue /admin/media para ver a biblioteca limpa\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBrokenImages();
