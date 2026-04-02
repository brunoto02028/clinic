import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding 3D printed products...');

  // Get the first clinic (or create a default one if needed)
  let clinic = await prisma.clinic.findFirst();
  
  if (!clinic) {
    console.log('No clinic found, creating default clinic...');
    clinic = await prisma.clinic.create({
      data: {
        name: 'BPR Rehab',
        slug: 'bpr-rehab',
        email: 'info@bpr.rehab',
        phone: '+44 20 1234 5678',
        address: 'London, UK',
        isActive: true,
      },
    });
  }

  const clinicId = clinic.id;

  // Product 1: Toe Spacer Premium
  const toespacer = await prisma.marketplaceProduct.upsert({
    where: { slug: 'bpr-toe-spacer-premium' },
    update: {},
    create: {
      clinicId,
      name: 'Separador de Dedos BPR Premium',
      slug: 'bpr-toe-spacer-premium',
      shortDescription: 'Separador de dedos 3D impresso em TPU médico. Alívio para joanete e conforto diário.',
      description: `O Separador de Dedos BPR Premium é um produto 3D impresso in-house com material TPU 95A de grau médico, desenhado para proporcionar alívio eficaz em casos de joanete, dedos comprimidos e desconforto plantar.

**Por que escolher o Separador BPR?**
✓ Desenhado por fisioterapeutas com base clínica
✓ Material TPU flexível e durável
✓ Impresso sob encomenda no Reino Unido
✓ 3 tamanhos para encaixe perfeito
✓ Lavável e reutilizável

**Para quem é indicado:**
- Pessoas com joanete leve a moderado
- Desconforto entre os dedos
- Uso diário para conforto
- Rotina de recuperação plantar
- Prevenção de deformidades

**Especificações:**
- Material: TPU 95A HF (grau médico)
- Tamanhos: P (UK 3-5), M (UK 6-8), G (UK 9-11)
- Cor: Natural (translúcido)
- Peso: ~5g
- Prazo de produção: 2-3 dias úteis
- Garantia: 30 dias`,
      category: 'toe_support',
      price: 24.99,
      currency: 'GBP',
      imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format&fit=crop',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
      ]),
      costPrice: 8.00,
      marginPercent: 67.97,
      compareAtPrice: 34.99,
      vatRate: 20,
      vatIncluded: true,
      sku: 'BPR-TS-001',
      weight: 0.005,
      stockQuantity: null, // Made to order
      trackStock: false,
      shippingCost: 3.99,
      freeShippingOver: 50,
      isDigital: false,
      isAffiliate: false,
      tags: JSON.stringify(['toe spacer', 'bunion', 'joanete', 'foot care', '3d printed', 'TPU', 'recovery']),
      featured: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log('✅ Created: Toe Spacer Premium');

  // Product 2: Arch Support Medium
  const archsupport = await prisma.marketplaceProduct.upsert({
    where: { slug: 'bpr-arch-support-medium' },
    update: {},
    create: {
      clinicId,
      name: 'Apoio de Arco BPR - Médio',
      slug: 'bpr-arch-support-medium',
      shortDescription: 'Apoio de arco 3D impresso para pés planos e fascite plantar. Altura média, material TPU.',
      description: `O Apoio de Arco BPR - Médio é um suporte plantar 3D impresso com TPU semi-rígido, desenhado para proporcionar suporte eficaz ao arco do pé em casos de pé plano, arco baixo ou fadiga plantar.

**Por que escolher o Apoio de Arco BPR?**
✓ Altura de arco média (ideal para maioria dos casos)
✓ Material TPU semi-rígido para suporte adequado
✓ Encaixe universal em diversos calçados
✓ Base antiderrapante
✓ Impresso sob encomenda no Reino Unido

**Para quem é indicado:**
- Pés planos ou arco baixo
- Fadiga plantar após longos períodos em pé
- Prevenção de fascite plantar
- Suporte diário para conforto
- Uso em calçado desportivo ou casual

**Especificações:**
- Material: TPU 95A HF
- Altura do arco: 2.5cm (médio)
- Dimensões: 7cm x 4cm x 2.5cm
- Peso: ~12g
- Cor: Natural
- Prazo de produção: 2-3 dias úteis
- Garantia: 30 dias`,
      category: 'arch_heel',
      price: 29.99,
      currency: 'GBP',
      imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80&auto=format&fit=crop',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80',
      ]),
      costPrice: 10.00,
      marginPercent: 66.64,
      compareAtPrice: 39.99,
      vatRate: 20,
      vatIncluded: true,
      sku: 'BPR-AS-002',
      weight: 0.012,
      stockQuantity: null,
      trackStock: false,
      shippingCost: 3.99,
      freeShippingOver: 50,
      isDigital: false,
      isAffiliate: false,
      tags: JSON.stringify(['arch support', 'plantar fasciitis', 'flat feet', '3d printed', 'TPU', 'foot care']),
      featured: true,
      isActive: true,
      sortOrder: 2,
    },
  });

  console.log('✅ Created: Arch Support Medium');

  // Product 3: Plantar Fasciitis Recovery Kit
  const recoverykit = await prisma.marketplaceProduct.upsert({
    where: { slug: 'bpr-plantar-fasciitis-recovery-kit' },
    update: {},
    create: {
      clinicId,
      name: 'Kit BPR para Fascite Plantar',
      slug: 'bpr-plantar-fasciitis-recovery-kit',
      shortDescription: 'Kit completo de recuperação para fascite plantar. Inclui apoio de arco, heel lift, massageador e guia.',
      description: `O Kit BPR para Fascite Plantar é uma solução completa de recuperação que combina produtos 3D impressos com protocolo clínico guiado. Ideal para quem sofre com dor plantar persistente.

**O que está incluído:**
✓ 1x Apoio de Arco BPR (altura média)
✓ 1x Heel Lift 5mm (par)
✓ 1x Massageador Plantar 3D
✓ 1x Guia Digital de Recuperação (PDF)
✓ 1x Vídeo com Protocolo de Exercícios (QR code)

**Por que escolher o Kit BPR?**
✓ Solução completa em vez de produtos isolados
✓ Protocolo clínico incluído
✓ Economia vs compra individual
✓ Todos os produtos impressos em 3D in-house
✓ Desenhado por fisioterapeutas

**Para quem é indicado:**
- Fascite plantar diagnosticada
- Dor no calcanhar pela manhã
- Dor plantar após atividade
- Recuperação pós-lesão
- Prevenção de recorrência

**Especificações:**
- Material: TPU 95A HF (todos os produtos)
- Peso total do kit: ~45g
- Prazo de produção: 3-4 dias úteis
- Garantia: 30 dias em todos os produtos
- Valor individual: £89.96
- **Economia: £19.97**`,
      category: 'recovery_kits',
      price: 69.99,
      currency: 'GBP',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&auto=format&fit=crop',
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80',
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
      ]),
      costPrice: 25.00,
      marginPercent: 64.28,
      compareAtPrice: 89.99,
      vatRate: 20,
      vatIncluded: true,
      sku: 'BPR-KIT-003',
      weight: 0.045,
      stockQuantity: null,
      trackStock: false,
      shippingCost: 0, // Free shipping for kits
      freeShippingOver: 0,
      isDigital: false,
      isAffiliate: false,
      tags: JSON.stringify(['recovery kit', 'plantar fasciitis', 'foot pain', '3d printed', 'bundle', 'complete solution']),
      featured: true,
      isActive: true,
      sortOrder: 3,
    },
  });

  console.log('✅ Created: Plantar Fasciitis Recovery Kit');

  console.log('\n✨ Seed completed successfully!');
  console.log(`\n📦 Created ${3} products for clinic: ${clinic.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
