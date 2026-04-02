const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script para re-gerar imagens de artigos usando IA
 * 
 * Este script identifica artigos com imagens quebradas e
 * fornece comandos para re-gerar via admin panel
 */

async function regenerateArticleImages() {
  console.log("🎨 RE-GERAÇÃO DE IMAGENS DE ARTIGOS\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        excerpt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📰 Total de artigos: ${articles.length}\n`);

    let brokenCount = 0;
    const brokenArticles = [];

    for (const article of articles) {
      const isBroken = article.imageUrl && 
                       (article.imageUrl.startsWith('/uploads/') || 
                        article.imageUrl.startsWith('data:'));
      
      if (isBroken) {
        brokenCount++;
        brokenArticles.push(article);
        
        console.log(`❌ "${article.title}"`);
        console.log(`   Slug: ${article.slug}`);
        console.log(`   URL quebrada: ${article.imageUrl.substring(0, 60)}...`);
        console.log(`   Ação: Editar artigo e gerar nova imagem com IA\n`);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n📊 RESUMO:`);
    console.log(`   Total de artigos: ${articles.length}`);
    console.log(`   Com imagens quebradas: ${brokenCount}`);
    console.log(`   Funcionando: ${articles.length - brokenCount}\n`);

    if (brokenCount > 0) {
      console.log("🔧 COMO CORRIGIR:\n");
      console.log("1. Acesse: https://bpr.rehab/admin/articles");
      console.log("2. Para cada artigo quebrado:");
      console.log("   a) Clique em 'Edit'");
      console.log("   b) Role até 'Cover Image'");
      console.log("   c) Clique em 'Generate with AI'");
      console.log("   d) Aguarde geração (60-120s)");
      console.log("   e) Clique em 'Save Article'\n");
      
      console.log("💡 DICA: A IA gerará automaticamente uma imagem baseada no título/conteúdo");
      console.log("💾 GARANTIA: Imagens serão salvas no InterServer (persistente)\n");
      
      console.log("📋 LISTA DE ARTIGOS PARA CORRIGIR:\n");
      brokenArticles.forEach((article, index) => {
        console.log(`${index + 1}. "${article.title}"`);
        console.log(`   https://bpr.rehab/admin/articles/${article.slug}/edit\n`);
      });
    } else {
      console.log("✅ Todos os artigos têm imagens funcionando!\n");
    }

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerateArticleImages();
