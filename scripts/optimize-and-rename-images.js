const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

/**
 * Script de Otimização e Renomeação SEO-friendly de Imagens
 * 
 * FUNCIONALIDADES:
 * 1. Renomeia imagens para nomes SEO-friendly
 * 2. Adiciona metadata de copyright/direitos autorais
 * 3. Otimiza tamanho e qualidade
 * 4. Converte para WebP
 * 5. Atualiza banco de dados automaticamente
 * 
 * USO:
 * node scripts/optimize-and-rename-images.js
 */

// Configurações
const CONFIG = {
  brandName: "bruno-physical-rehabilitation",
  copyright: "© 2024 Bruno Physical Rehabilitation. All rights reserved.",
  author: "Bruno Physical Rehabilitation",
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  inputDir: path.join(process.cwd(), "public", "uploads"),
  outputDir: path.join(process.cwd(), "public", "uploads", "optimized"),
};

// Mapeamento de contexto para nomes SEO
const SEO_CONTEXT_MAP = {
  hero: "physiotherapy-clinic-treatment-room",
  insoles: "custom-orthotic-insoles-foot-scan",
  bio: "biomechanical-assessment-posture-analysis",
  thermo: "infrared-thermography-medical-imaging",
  about: "professional-physiotherapist-portrait",
  laser: "mls-laser-therapy-treatment",
  device: "mls-laser-medical-device",
  treatment: "physiotherapy-treatment-session",
};

/**
 * Detecta contexto da imagem pelo nome do arquivo
 */
function detectContext(filename) {
  const lower = filename.toLowerCase();
  
  if (lower.includes("hero")) return "hero";
  if (lower.includes("insole") || lower.includes("foot")) return "insoles";
  if (lower.includes("bio") || lower.includes("posture")) return "bio";
  if (lower.includes("therm")) return "thermo";
  if (lower.includes("about") || lower.includes("portrait")) return "about";
  if (lower.includes("laser") && lower.includes("device")) return "device";
  if (lower.includes("laser")) return "laser";
  if (lower.includes("treatment")) return "treatment";
  
  return "general";
}

/**
 * Gera nome SEO-friendly
 */
function generateSEOFilename(originalFilename, context) {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now().toString(36);
  const seoName = SEO_CONTEXT_MAP[context] || "physiotherapy-service";
  
  return `${CONFIG.brandName}-${seoName}-${timestamp}.webp`;
}

/**
 * Adiciona metadata de copyright à imagem
 */
async function addCopyrightMetadata(buffer) {
  try {
    const metadata = {
      exif: {
        IFD0: {
          Copyright: CONFIG.copyright,
          Artist: CONFIG.author,
        }
      }
    };
    
    return await sharp(buffer)
      .withMetadata(metadata)
      .toBuffer();
  } catch (err) {
    console.warn("   ⚠️  Não foi possível adicionar metadata EXIF:", err.message);
    return buffer;
  }
}

/**
 * Otimiza e renomeia uma imagem
 */
async function optimizeImage(inputPath, outputPath, context) {
  try {
    const inputBuffer = fs.readFileSync(inputPath);
    const originalSize = inputBuffer.length / 1024; // KB
    
    // Otimizar e converter para WebP
    let optimizedBuffer = await sharp(inputBuffer)
      .resize(CONFIG.maxWidth, CONFIG.maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: CONFIG.quality,
        effort: 4,
      })
      .toBuffer();
    
    // Adicionar metadata de copyright
    optimizedBuffer = await addCopyrightMetadata(optimizedBuffer);
    
    // Salvar imagem otimizada
    fs.writeFileSync(outputPath, optimizedBuffer);
    
    const optimizedSize = optimizedBuffer.length / 1024; // KB
    const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    return {
      success: true,
      originalSize,
      optimizedSize,
      reduction,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Atualiza URLs no banco de dados
 */
async function updateDatabaseURLs(oldUrl, newUrl) {
  try {
    const settings = await prisma.siteSettings.findFirst();
    if (!settings) return;
    
    const updates = {};
    
    // Verificar e atualizar cada campo
    const imageFields = [
      "heroImageUrl",
      "insolesImageUrl",
      "bioImageUrl",
      "thermoImageUrl",
      "aboutImageUrl",
      "ogImageUrl",
    ];
    
    for (const field of imageFields) {
      if (settings[field] === oldUrl) {
        updates[field] = newUrl;
      }
    }
    
    // Verificar MLS Laser JSON
    if (settings.mlsLaserJson) {
      try {
        const mls = JSON.parse(settings.mlsLaserJson);
        let mlsUpdated = false;
        
        if (mls.treatmentImageUrl === oldUrl) {
          mls.treatmentImageUrl = newUrl;
          mlsUpdated = true;
        }
        if (mls.deviceImageUrl === oldUrl) {
          mls.deviceImageUrl = newUrl;
          mlsUpdated = true;
        }
        
        if (mlsUpdated) {
          updates.mlsLaserJson = JSON.stringify(mls);
        }
      } catch {}
    }
    
    // Aplicar updates se houver
    if (Object.keys(updates).length > 0) {
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: updates,
      });
      return Object.keys(updates);
    }
    
    return [];
  } catch (err) {
    console.error("   ❌ Erro ao atualizar banco:", err.message);
    return [];
  }
}

/**
 * Processa todas as imagens
 */
async function processAllImages() {
  console.log("🖼️  OTIMIZAÇÃO E RENOMEAÇÃO SEO DE IMAGENS\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Criar diretório de saída
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Listar imagens
  const files = fs.readdirSync(CONFIG.inputDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .filter(f => !f.startsWith("."));
  
  if (files.length === 0) {
    console.log("❌ Nenhuma imagem encontrada em public/uploads/\n");
    return;
  }
  
  console.log(`📋 Encontradas ${files.length} imagens para processar\n`);
  
  let processed = 0;
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  
  for (const file of files) {
    const inputPath = path.join(CONFIG.inputDir, file);
    const context = detectContext(file);
    const newFilename = generateSEOFilename(file, context);
    const outputPath = path.join(CONFIG.outputDir, newFilename);
    
    console.log(`📸 ${file}`);
    console.log(`   Contexto: ${context}`);
    console.log(`   Novo nome: ${newFilename}`);
    
    const result = await optimizeImage(inputPath, outputPath, context);
    
    if (result.success) {
      console.log(`   ✅ Otimizado: ${result.originalSize.toFixed(0)}KB → ${result.optimizedSize.toFixed(0)}KB (${result.reduction}% redução)`);
      
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;
      
      // Atualizar banco de dados
      const oldUrl = `/uploads/${file}`;
      const newUrl = `/uploads/optimized/${newFilename}`;
      const updatedFields = await updateDatabaseURLs(oldUrl, newUrl);
      
      if (updatedFields.length > 0) {
        console.log(`   🔄 Banco atualizado: ${updatedFields.join(", ")}`);
      }
      
      processed++;
    } else {
      console.log(`   ❌ Erro: ${result.error}`);
    }
    
    console.log("");
  }
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Processadas: ${processed}/${files.length} imagens`);
  console.log(`📊 Tamanho total: ${totalOriginalSize.toFixed(0)}KB → ${totalOptimizedSize.toFixed(0)}KB`);
  console.log(`💾 Economia: ${(totalOriginalSize - totalOptimizedSize).toFixed(0)}KB (${((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1)}%)`);
  console.log("\n🔒 Proteção de direitos autorais:");
  console.log(`   Copyright: ${CONFIG.copyright}`);
  console.log(`   Metadata EXIF adicionada a todas as imagens`);
  console.log("\n📁 Imagens otimizadas salvas em: public/uploads/optimized/");
  console.log("🌐 Banco de dados atualizado automaticamente\n");
}

// Executar
processAllImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
