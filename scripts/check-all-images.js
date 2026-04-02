const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkAllImages() {
  console.log("🔍 VERIFICANDO TODAS AS IMAGENS DO SITE\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // 1. Site Settings
    console.log("📋 SITE SETTINGS:");
    const settings = await prisma.siteSettings.findFirst();
    if (settings) {
      const settingsImages = {
        heroImageUrl: settings.heroImageUrl,
        insolesImageUrl: settings.insolesImageUrl,
        bioImageUrl: settings.bioImageUrl,
        thermoImageUrl: settings.thermoImageUrl,
        aboutImageUrl: settings.aboutImageUrl,
        ogImageUrl: settings.ogImageUrl,
      };
      
      for (const [key, url] of Object.entries(settingsImages)) {
        if (url) {
          const status = url.startsWith('data:') ? '⚠️  DATA URL' : 
                        url.startsWith('http') ? '✅ HTTP URL' : 
                        url.startsWith('/uploads') ? '❌ LOCAL (quebrado)' : '❓ DESCONHECIDO';
          console.log(`   ${key}: ${status}`);
          console.log(`      ${url.substring(0, 80)}...`);
        } else {
          console.log(`   ${key}: ❌ VAZIO`);
        }
      }
      
      // MLS Laser
      if (settings.mlsLaserJson) {
        try {
          const mls = JSON.parse(settings.mlsLaserJson);
          console.log("\n   MLS Laser:");
          if (mls.treatmentImageUrl) {
            const status = mls.treatmentImageUrl.startsWith('data:') ? '⚠️  DATA URL' : 
                          mls.treatmentImageUrl.startsWith('http') ? '✅ HTTP URL' : 
                          mls.treatmentImageUrl.startsWith('/uploads') ? '❌ LOCAL (quebrado)' : '❓ DESCONHECIDO';
            console.log(`      treatmentImageUrl: ${status}`);
            console.log(`         ${mls.treatmentImageUrl.substring(0, 80)}...`);
          }
          if (mls.deviceImageUrl) {
            const status = mls.deviceImageUrl.startsWith('data:') ? '⚠️  DATA URL' : 
                          mls.deviceImageUrl.startsWith('http') ? '✅ HTTP URL' : 
                          mls.deviceImageUrl.startsWith('/uploads') ? '❌ LOCAL (quebrado)' : '❓ DESCONHECIDO';
            console.log(`      deviceImageUrl: ${status}`);
            console.log(`         ${mls.deviceImageUrl.substring(0, 80)}...`);
          }
        } catch {}
      }
    }

    // 2. Articles
    console.log("\n\n📰 ARTIGOS:");
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        imageUrl: true,
        slug: true,
      },
    });
    
    console.log(`   Total de artigos: ${articles.length}\n`);
    
    let articlesWithImages = 0;
    let articlesWithBrokenImages = 0;
    let articlesWithDataUrls = 0;
    let articlesWithHttpUrls = 0;
    
    for (const article of articles) {
      if (article.imageUrl) {
        articlesWithImages++;
        const status = article.imageUrl.startsWith('data:') ? '⚠️  DATA URL' : 
                      article.imageUrl.startsWith('http') ? '✅ HTTP URL' : 
                      article.imageUrl.startsWith('/uploads') ? '❌ LOCAL (quebrado)' : '❓ DESCONHECIDO';
        
        if (article.imageUrl.startsWith('data:')) articlesWithDataUrls++;
        else if (article.imageUrl.startsWith('http')) articlesWithHttpUrls++;
        else if (article.imageUrl.startsWith('/uploads')) articlesWithBrokenImages++;
        
        console.log(`   ${status} "${article.title}"`);
        console.log(`      ${article.imageUrl.substring(0, 80)}...`);
      }
    }
    
    console.log(`\n   Resumo:`);
    console.log(`      Com imagens: ${articlesWithImages}/${articles.length}`);
    console.log(`      ✅ HTTP URLs: ${articlesWithHttpUrls}`);
    console.log(`      ⚠️  Data URLs: ${articlesWithDataUrls}`);
    console.log(`      ❌ Quebradas (local): ${articlesWithBrokenImages}`);
    console.log(`      ❌ Sem imagem: ${articles.length - articlesWithImages}`);

    // 3. Image Library
    console.log("\n\n📚 IMAGE LIBRARY:");
    const libraryImages = await prisma.imageLibrary.findMany({
      select: {
        id: true,
        fileName: true,
        imageUrl: true,
        cloud_storage_path: true,
      },
    });
    
    console.log(`   Total de imagens: ${libraryImages.length}\n`);
    
    let libraryDataUrls = 0;
    let libraryHttpUrls = 0;
    let libraryBroken = 0;
    
    for (const img of libraryImages) {
      const status = img.imageUrl.startsWith('data:') ? '⚠️  DATA URL' : 
                    img.imageUrl.startsWith('http') ? '✅ HTTP URL' : 
                    img.imageUrl.startsWith('/uploads') ? '❌ LOCAL (quebrado)' : '❓ DESCONHECIDO';
      
      if (img.imageUrl.startsWith('data:')) libraryDataUrls++;
      else if (img.imageUrl.startsWith('http')) libraryHttpUrls++;
      else if (img.imageUrl.startsWith('/uploads')) libraryBroken++;
      
      console.log(`   ${status} ${img.fileName}`);
      console.log(`      Storage: ${img.cloud_storage_path || 'N/A'}`);
    }
    
    console.log(`\n   Resumo:`);
    console.log(`      ✅ HTTP URLs: ${libraryHttpUrls}`);
    console.log(`      ⚠️  Data URLs: ${libraryDataUrls}`);
    console.log(`      ❌ Quebradas (local): ${libraryBroken}`);

    // Summary
    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 RESUMO GERAL:");
    console.log(`   Artigos sem imagem: ${articles.length - articlesWithImages}`);
    console.log(`   Imagens quebradas (local /uploads): ${articlesWithBrokenImages + libraryBroken}`);
    console.log(`   Data URLs (temporárias): ${articlesWithDataUrls + libraryDataUrls}`);
    console.log(`   HTTP URLs (funcionando): ${articlesWithHttpUrls + libraryHttpUrls}`);
    
    console.log("\n💡 AÇÃO NECESSÁRIA:");
    if (articlesWithBrokenImages > 0 || libraryBroken > 0) {
      console.log("   ❌ Há imagens quebradas que precisam ser re-uploadadas");
      console.log("   📝 Execute: node scripts/migrate-images-to-interserver.js");
    }
    if (articlesWithDataUrls > 0 || libraryDataUrls > 0) {
      console.log("   ⚠️  Há data URLs que podem ser migradas para InterServer");
      console.log("   📝 Execute: node scripts/migrate-dataurls-to-interserver.js");
    }
    if (articles.length - articlesWithImages > 0) {
      console.log("   ❌ Há artigos sem imagem que precisam de imagens");
      console.log("   📝 Adicione imagens manualmente via admin panel");
    }
    
    console.log("\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllImages();
