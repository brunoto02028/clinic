const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para limpar banco de dados e corrigir logo definitivamente
 */

async function cleanupAndFixLogo() {
  console.log("🧹 LIMPEZA E CORREÇÃO DEFINITIVA\n");

  try {
    // 1. Deletar TODAS as imagens quebradas (data URLs e /uploads/ locais)
    console.log("1️⃣ Deletando imagens quebradas...");
    
    const brokenImages = await prisma.imageLibrary.findMany({
      where: {
        OR: [
          { imageUrl: { startsWith: '/uploads/' } },
          { cloud_storage_path: { startsWith: 'local:' } },
        ]
      }
    });

    console.log(`   Encontradas ${brokenImages.length} imagens quebradas`);

    if (brokenImages.length > 0) {
      await prisma.imageLibrary.deleteMany({
        where: {
          OR: [
            { imageUrl: { startsWith: '/uploads/' } },
            { cloud_storage_path: { startsWith: 'local:' } },
          ]
        }
      });
      console.log(`   ✅ ${brokenImages.length} imagens quebradas deletadas\n`);
    }

    // 2. Buscar logo correto que existe (InterServer)
    console.log("2️⃣ Buscando logo correto...");
    
    const logoImage = await prisma.imageLibrary.findFirst({
      where: {
        AND: [
          { fileName: { contains: 'Novo_logo_Bruno2' } },
          { imageUrl: { startsWith: 'http' } }
        ]
      }
    });

    if (!logoImage) {
      console.log("   ⚠️  Logo não encontrado na biblioteca!");
      console.log("   Você precisa fazer upload do logo novamente.\n");
      return;
    }

    console.log(`   ✅ Logo encontrado: ${logoImage.imageUrl}\n`);

    // 3. Atualizar TODAS as configurações de logo
    console.log("3️⃣ Atualizando configurações de logo...");
    
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("   ❌ Configurações não encontradas!");
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: {
        logoUrl: logoImage.imageUrl,
        darkLogoUrl: logoImage.imageUrl,
        screenLogos: {
          landingHeader: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
          landingFooter: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
          adminHeader: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
          login: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
          signup: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
          dashboard: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
          forgotPassword: {
            logoUrl: logoImage.imageUrl,
            darkLogoUrl: logoImage.imageUrl,
          },
        },
      },
    });

    console.log("   ✅ Logo atualizado em TODAS as telas\n");

    // 4. Resumo final
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 RESUMO:\n");
    console.log(`   🗑️  Imagens deletadas: ${brokenImages.length}`);
    console.log(`   🖼️  Logo correto: ${logoImage.imageUrl}`);
    console.log(`   ✅ Configurações atualizadas\n`);
    console.log("🌐 Recarregue https://bpr.rehab (Ctrl+Shift+R)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndFixLogo();
