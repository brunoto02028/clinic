const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Script simples para limpar URLs quebradas de artigos
 * Isso forçará o sistema a mostrar o botão "Generate with AI" no admin
 */

async function fixArticleImages() {
  console.log("🔧 LIMPANDO URLS QUEBRADAS DE ARTIGOS\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
      },
    });

    const brokenArticles = articles.filter(article => 
      article.imageUrl && 
      (article.imageUrl.startsWith('/uploads/') || article.imageUrl.startsWith('data:'))
    );

    console.log(`📊 Total de artigos: ${articles.length}`);
    console.log(`❌ Com URLs quebradas: ${brokenArticles.length}\n`);

    if (brokenArticles.length === 0) {
      console.log("✅ Nenhum artigo com URL quebrada!\n");
      return;
    }

    console.log("🧹 Limpando URLs quebradas...\n");

    let cleaned = 0;
    for (const article of brokenArticles) {
      await prisma.article.update({
        where: { id: article.id },
        data: { imageUrl: null },
      });
      console.log(`   ✅ Limpou: "${article.title}"`);
      cleaned++;
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n✅ CONCLUÍDO! ${cleaned} artigos limpos\n`);
    console.log("📝 PRÓXIMOS PASSOS:\n");
    console.log("1. Acesse: https://bpr.rehab/admin/articles");
    console.log("2. Edite cada artigo");
    console.log("3. Clique em 'Generate with AI' na seção Cover Image");
    console.log("4. Aguarde 60-120s para geração");
    console.log("5. Salve o artigo\n");
    console.log("💡 As novas imagens serão salvas automaticamente no InterServer!\n");

  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixArticleImages();
