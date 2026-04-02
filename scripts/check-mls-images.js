const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkMLSImages() {
  console.log("🔍 Verificando imagens do MLS Laser...\n");
  
  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Nenhuma configuração encontrada");
      return;
    }
    
    console.log("📋 MLS Laser JSON:");
    console.log(settings.mlsLaserJson || "(vazio)");
    console.log("\n");
    
    if (settings.mlsLaserJson) {
      try {
        const mls = JSON.parse(settings.mlsLaserJson);
        console.log("✅ Imagens configuradas:");
        console.log("   Treatment Image:", mls.treatmentImageUrl || "(não configurado)");
        console.log("   Device Image:", mls.deviceImageUrl || "(não configurado)");
      } catch (err) {
        console.log("❌ Erro ao parsear JSON:", err.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMLSImages();
