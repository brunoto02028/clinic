const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.siteSettings.findFirst();
  if (settings) {
    console.log('Logo URL (logo correto):', settings.logoUrl || 'Não configurado');
    console.log('Dark Logo URL:', settings.darkLogoUrl || 'Não configurado');
    console.log('Favicon URL:', settings.faviconUrl || 'Não configurado');
  } else {
    console.log('Nenhuma configuração encontrada');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
