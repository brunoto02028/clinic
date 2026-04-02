import { PrismaClient } from "@prisma/client";
import { uploadToInterServer } from "../lib/interserver-storage";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/**
 * Script para fazer upload do logo correto e atualizar banco
 */

async function uploadAndFixLogo() {
  console.log("📤 UPLOAD E CORREÇÃO DO LOGO\n");

  try {
    // Você precisa ter o arquivo do logo em algum lugar
    // Vamos verificar se existe algum logo na pasta public ou downloads
    
    const possiblePaths = [
      "/Users/brunotoaz/Downloads/Novo_logo_Bruno2.png",
      "/Users/brunotoaz/Downloads/logo.png",
      "/Users/brunotoaz/Desktop/Novo_logo_Bruno2.png",
    ];

    let logoPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        logoPath = p;
        break;
      }
    }

    if (!logoPath) {
      console.log("❌ Logo não encontrado!");
      console.log("\nPor favor:");
      console.log("1. Baixe o logo correto");
      console.log("2. Salve em /Users/brunotoaz/Downloads/Novo_logo_Bruno2.png");
      console.log("3. Execute este script novamente\n");
      return;
    }

    console.log(`✅ Logo encontrado: ${logoPath}\n`);

    // Ler arquivo
    const buffer = fs.readFileSync(logoPath);
    const filename = `logo-${Date.now()}.png`;

    console.log("📤 Fazendo upload para InterServer...");
    
    // Upload para InterServer
    const imageUrl = await uploadToInterServer(buffer, filename);
    
    console.log(`✅ Upload concluído: ${imageUrl}\n`);

    // Salvar na biblioteca
    console.log("💾 Salvando na biblioteca...");
    
    const image = await prisma.imageLibrary.create({
      data: {
        fileName: filename,
        originalName: "Novo_logo_Bruno2.png",
        fileSize: buffer.length,
        mimeType: "image/png",
        imageUrl,
        cloud_storage_path: `interserver:${filename}`,
        category: "logo",
        altText: "BPR Logo",
        uploadedById: "system",
      },
    });

    console.log("✅ Logo salvo na biblioteca\n");

    // Atualizar configurações
    console.log("⚙️  Atualizando configurações...");
    
    const settings = await prisma.siteSettings.findFirst();
    
    if (settings) {
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: {
          logoUrl: imageUrl,
          darkLogoUrl: imageUrl,
          screenLogos: {
            landingHeader: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
            landingFooter: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
            adminHeader: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
            login: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
            signup: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
            dashboard: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
            forgotPassword: { logoUrl: imageUrl, darkLogoUrl: imageUrl },
          },
        },
      });
      console.log("✅ Configurações atualizadas\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ CONCLUÍDO!\n");
    console.log(`   Logo URL: ${imageUrl}`);
    console.log("\n🌐 Recarregue https://bpr.rehab (Ctrl+Shift+R)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

uploadAndFixLogo();
