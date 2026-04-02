const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

async function listAllImages() {
  console.log("🔍 LISTANDO TODAS AS IMAGENS DO SISTEMA\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    // 1. IMAGENS NO BANCO DE DADOS (ImageLibrary)
    console.log("📚 IMAGENS NA BIBLIOTECA (ImageLibrary):");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const imageLibrary = await prisma.imageLibrary.findMany({
      select: {
        id: true,
        fileName: true,
        imageUrl: true,
        category: true,
        uploadedBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (imageLibrary.length > 0) {
      imageLibrary.forEach((img, i) => {
        console.log(`\n${i + 1}. ID: ${img.id}`);
        console.log(`   Arquivo: ${img.fileName}`);
        console.log(`   URL: ${img.imageUrl}`);
        console.log(`   Categoria: ${img.category || "sem categoria"}`);
        console.log(`   Enviado por: ${img.uploadedBy || "desconhecido"}`);
        console.log(`   Data: ${img.createdAt.toLocaleString()}`);
      });
      console.log(`\n✅ Total: ${imageLibrary.length} imagens na biblioteca`);
    } else {
      console.log("❌ Nenhuma imagem na biblioteca");
    }

    // 2. IMAGENS NO SITE SETTINGS
    console.log("\n\n⚙️  IMAGENS NAS CONFIGURAÇÕES DO SITE:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const settings = await prisma.siteSettings.findFirst();
    
    if (settings) {
      const imageFields = [
        { name: "Logo", url: settings.logoUrl },
        { name: "Dark Logo", url: settings.darkLogoUrl },
        { name: "Favicon", url: settings.faviconUrl },
        { name: "Hero Image", url: settings.heroImageUrl },
        { name: "Insoles Image", url: settings.insolesImageUrl },
        { name: "Bio Image", url: settings.bioImageUrl },
        { name: "Thermo Image", url: settings.thermoImageUrl },
      ];

      imageFields.forEach((field, i) => {
        if (field.url) {
          console.log(`\n${i + 1}. ${field.name}:`);
          console.log(`   URL: ${field.url}`);
        }
      });

      const hasImages = imageFields.some(f => f.url);
      if (!hasImages) {
        console.log("❌ Nenhuma imagem configurada");
      }
    } else {
      console.log("❌ Nenhuma configuração encontrada");
    }

    // 3. IMAGENS NO DIRETÓRIO /public/uploads/
    console.log("\n\n📁 IMAGENS NO DIRETÓRIO /public/uploads/:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    
    function listFilesRecursive(dir, prefix = "") {
      const files = fs.readdirSync(dir);
      let count = 0;
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          console.log(`\n📂 ${prefix}${file}/`);
          count += listFilesRecursive(fullPath, prefix + "  ");
        } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
          const sizeKB = (stat.size / 1024).toFixed(2);
          const relativePath = fullPath.replace(process.cwd() + "/public", "");
          console.log(`   ${prefix}📄 ${file} (${sizeKB} KB)`);
          console.log(`      ${prefix}Path: ${relativePath}`);
          count++;
        }
      });
      
      return count;
    }

    if (fs.existsSync(uploadsDir)) {
      const totalFiles = listFilesRecursive(uploadsDir);
      console.log(`\n✅ Total: ${totalFiles} arquivos de imagem`);
    } else {
      console.log("❌ Diretório /public/uploads/ não existe");
    }

    // 4. RESUMO E INSTRUÇÕES
    console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 RESUMO:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📚 Imagens na biblioteca: ${imageLibrary.length}`);
    console.log(`📁 Arquivos físicos: verificados acima`);
    
    console.log("\n\n💡 PARA DELETAR IMAGENS:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("1. Deletar da biblioteca:");
    console.log("   node scripts/delete-image.js <ID>");
    console.log("\n2. Deletar arquivo físico:");
    console.log("   rm public/uploads/<nome-do-arquivo>");
    console.log("\n3. Limpar configurações do site:");
    console.log("   node scripts/clean-image-urls.js");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllImages();
