const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

/**
 * Script para fazer upload em massa de imagens para o site
 * 
 * USO:
 * 1. Coloque suas imagens na pasta: public/uploads/temp/
 * 2. Nomeie as imagens como:
 *    - hero.jpg (para Hero Section)
 *    - insoles.jpg (para Custom Insoles)
 *    - bio.jpg (para Biomechanics)
 *    - thermo.jpg (para Thermography)
 *    - about.jpg (para About Section)
 * 3. Execute: node scripts/bulk-upload-images.js
 */

async function bulkUploadImages() {
  console.log("🖼️  UPLOAD EM MASSA DE IMAGENS\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const tempDir = path.join(process.cwd(), "public", "uploads", "temp");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  // Criar diretório temp se não existir
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log("📁 Diretório temp criado em: public/uploads/temp/");
    console.log("   Coloque suas imagens lá e execute novamente.\n");
    return;
  }

  // Mapear nomes de arquivo para campos do banco
  const imageMap = {
    "hero.jpg": "heroImageUrl",
    "hero.jpeg": "heroImageUrl",
    "hero.png": "heroImageUrl",
    "hero.webp": "heroImageUrl",
    
    "insoles.jpg": "insolesImageUrl",
    "insoles.jpeg": "insolesImageUrl",
    "insoles.png": "insolesImageUrl",
    "insoles.webp": "insolesImageUrl",
    
    "bio.jpg": "bioImageUrl",
    "bio.jpeg": "bioImageUrl",
    "bio.png": "bioImageUrl",
    "bio.webp": "bioImageUrl",
    "biomechanics.jpg": "bioImageUrl",
    "biomechanics.jpeg": "bioImageUrl",
    "biomechanics.png": "bioImageUrl",
    
    "thermo.jpg": "thermoImageUrl",
    "thermo.jpeg": "thermoImageUrl",
    "thermo.png": "thermoImageUrl",
    "thermography.jpg": "thermoImageUrl",
    "thermography.jpeg": "thermoImageUrl",
    
    "about.jpg": "aboutImageUrl",
    "about.jpeg": "aboutImageUrl",
    "about.png": "aboutImageUrl",
  };

  // Ler arquivos do diretório temp
  const files = fs.readdirSync(tempDir);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  if (imageFiles.length === 0) {
    console.log("❌ Nenhuma imagem encontrada em public/uploads/temp/");
    console.log("\n💡 Coloque suas imagens lá com os seguintes nomes:");
    console.log("   - hero.jpg (Hero Section)");
    console.log("   - insoles.jpg (Custom Insoles)");
    console.log("   - bio.jpg (Biomechanics)");
    console.log("   - thermo.jpg (Thermography)");
    console.log("   - about.jpg (About Section)\n");
    return;
  }

  console.log(`📋 Encontradas ${imageFiles.length} imagens:\n`);

  const updates = {};
  const moved = [];

  for (const file of imageFiles) {
    const lowerFile = file.toLowerCase();
    const field = imageMap[lowerFile];

    if (field) {
      // Mover arquivo para uploads/
      const timestamp = Date.now();
      const ext = path.extname(file);
      const newName = `${field.replace("ImageUrl", "")}-${timestamp}${ext}`;
      const sourcePath = path.join(tempDir, file);
      const destPath = path.join(uploadsDir, newName);

      fs.copyFileSync(sourcePath, destPath);
      fs.unlinkSync(sourcePath);

      updates[field] = `/uploads/${newName}`;
      moved.push({ original: file, new: newName, field });

      console.log(`✅ ${file} → ${newName}`);
      console.log(`   Campo: ${field}`);
      console.log(`   URL: /uploads/${newName}\n`);
    } else {
      console.log(`⚠️  ${file} - nome não reconhecido, ignorado\n`);
    }
  }

  if (Object.keys(updates).length === 0) {
    console.log("❌ Nenhuma imagem válida para processar\n");
    return;
  }

  // Atualizar banco de dados
  try {
    const settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      console.log("❌ Configurações do site não encontradas\n");
      return;
    }

    await prisma.siteSettings.update({
      where: { id: settings.id },
      data: updates,
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUCESSO! Imagens atualizadas no banco de dados\n");
    console.log("📊 Resumo:");
    moved.forEach(m => {
      console.log(`   ${m.field}: ${updates[m.field]}`);
    });
    console.log("\n🌐 As imagens agora estão visíveis no site!");
    console.log("   Acesse: https://bpr.rehab para ver\n");

  } catch (error) {
    console.error("❌ Erro ao atualizar banco de dados:", error);
  } finally {
    await prisma.$disconnect();
  }
}

bulkUploadImages();
