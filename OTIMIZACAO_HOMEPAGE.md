# 🚀 PLANO DE OTIMIZAÇÃO DA HOMEPAGE

**Problema Atual:** Homepage demora >30s para carregar  
**Objetivo:** Reduzir para <3s  
**Impacto Esperado:** 90% mais rápido

---

## 🔍 DIAGNÓSTICO

### **Problemas Identificados:**

1. **Imagens Não Otimizadas** 🖼️
   - Artigos carregam imagens grandes
   - Sem lazy loading adequado
   - Qualidade muito alta (70-75)
   - Sem WebP/AVIF

2. **Renderização Client-Side** ⚡
   - Componente usa "use client"
   - Todo conteúdo renderizado no browser
   - Sem SSR/SSG

3. **Muitos Dados Carregados** 📊
   - Artigos completos carregados
   - Settings grandes
   - JSON pesados

4. **Sem Cache** 💾
   - Sem cache de assets
   - Sem cache de API
   - Sem revalidação

---

## 🎯 ESTRATÉGIA DE OTIMIZAÇÃO

### **FASE 1: OTIMIZAÇÃO DE IMAGENS** (Impacto: 60%)

#### **1.1 Usar Next.js Image Optimization**

**Antes:**
```tsx
<Image 
  src={article.imageUrl} 
  alt={article.title} 
  fill 
  className="object-cover" 
  loading="lazy" 
  quality={70}
/>
```

**Depois:**
```tsx
<Image 
  src={article.imageUrl} 
  alt={article.title} 
  fill 
  className="object-cover" 
  loading="lazy" 
  quality={60}              // ⬇️ Reduzir de 70 para 60
  placeholder="blur"        // ✨ Adicionar blur placeholder
  blurDataURL="data:..."    // ✨ Base64 pequeno
  sizes="(max-width: 768px) 100vw, 33vw"
  priority={false}          // ✨ Não é prioridade
/>
```

**Benefícios:**
- ✅ Reduz tamanho em ~40%
- ✅ Blur placeholder melhora UX
- ✅ Lazy loading automático
- ✅ WebP/AVIF automático

---

#### **1.2 Implementar Lazy Loading Agressivo**

**Antes:**
```tsx
// Todos os artigos carregam ao mesmo tempo
{articles.map(article => (
  <ArticleCard article={article} />
))}
```

**Depois:**
```tsx
// Carregar apenas quando visível
import dynamic from 'next/dynamic';

const ArticleCard = dynamic(() => import('./ArticleCard'), {
  loading: () => <ArticleCardSkeleton />,
  ssr: false
});

// Ou usar Intersection Observer
{articles.map((article, index) => (
  <LazyLoad 
    key={article.id}
    offset={200}           // ✨ Carregar 200px antes
    once                   // ✨ Carregar apenas 1x
  >
    <ArticleCard article={article} />
  </LazyLoad>
))}
```

**Benefícios:**
- ✅ Carrega apenas o visível
- ✅ Reduz tempo inicial em ~70%
- ✅ Melhora perceived performance

---

#### **1.3 Comprimir Imagens Existentes**

**Script de Compressão:**
```bash
# Instalar sharp
npm install sharp

# Criar script de otimização
node scripts/optimize-images.js
```

**Script:**
```javascript
// scripts/optimize-images.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeImage(inputPath, outputPath) {
  await sharp(inputPath)
    .resize(1200, null, { // Max width 1200px
      withoutEnlargement: true
    })
    .webp({ quality: 80 }) // Converter para WebP
    .toFile(outputPath);
}

// Processar todas as imagens em /public/uploads
```

**Benefícios:**
- ✅ Reduz tamanho em ~60-80%
- ✅ WebP é 30% menor que JPEG
- ✅ Mantém qualidade visual

---

### **FASE 2: SERVER-SIDE RENDERING** (Impacto: 25%)

#### **2.1 Converter para Server Component**

**Antes:**
```tsx
"use client";  // ❌ Tudo no cliente

export default function LandingPage({ settings, articles }) {
  const [locale, setLocale] = useState('en');
  // ...
}
```

**Depois:**
```tsx
// ✅ Remover "use client" do componente principal
// ✅ Mover interatividade para componentes menores

// app/page.tsx (Server Component)
export default async function HomePage() {
  const settings = await getSettings();
  const articles = await getArticles();
  
  return (
    <LandingPageLayout settings={settings}>
      <HeroSection settings={settings} />
      <ArticlesSection articles={articles} />
      {/* Componentes interativos separados */}
      <LanguageSwitcher />
      <MobileMenu />
    </LandingPageLayout>
  );
}

// components/LanguageSwitcher.tsx (Client Component)
"use client";
export function LanguageSwitcher() {
  const [locale, setLocale] = useState('en');
  // Apenas este componente é client-side
}
```

**Benefícios:**
- ✅ HTML renderizado no servidor
- ✅ Conteúdo visível imediatamente
- ✅ Menos JavaScript no cliente
- ✅ Melhor SEO

---

#### **2.2 Implementar Static Generation (SSG)**

**Configuração:**
```tsx
// app/page.tsx
export const revalidate = 3600; // ✨ Revalidar a cada 1 hora

export default async function HomePage() {
  const settings = await getSettings();
  const articles = await getArticles();
  
  return <LandingPage settings={settings} articles={articles} />;
}
```

**Benefícios:**
- ✅ Página gerada no build
- ✅ Servida como HTML estático
- ✅ Tempo de resposta <100ms
- ✅ Revalida automaticamente

---

### **FASE 3: OTIMIZAÇÃO DE DADOS** (Impacto: 10%)

#### **3.1 Reduzir Payload de Artigos**

**Antes:**
```typescript
// Carrega artigo completo
const articles = await prisma.article.findMany({
  include: {
    author: true,
    tags: true,
    // Tudo...
  }
});
```

**Depois:**
```typescript
// Carregar apenas o necessário para preview
const articles = await prisma.article.findMany({
  take: 3,  // ✨ Apenas 3 artigos
  select: {
    id: true,
    title: true,
    excerpt: true,
    imageUrl: true,
    slug: true,
    createdAt: true,
    author: {
      select: {
        firstName: true,
        lastName: true
      }
    }
    // ❌ Sem content completo
    // ❌ Sem tags
  },
  orderBy: { createdAt: 'desc' }
});
```

**Benefícios:**
- ✅ Reduz payload em ~80%
- ✅ Menos dados para transferir
- ✅ Mais rápido para processar

---

#### **3.2 Implementar Cache de Settings**

**Antes:**
```typescript
// Busca settings toda vez
const settings = await prisma.siteSettings.findFirst();
```

**Depois:**
```typescript
// Cache com Next.js
import { unstable_cache } from 'next/cache';

const getSettings = unstable_cache(
  async () => {
    return await prisma.siteSettings.findFirst();
  },
  ['site-settings'],
  { revalidate: 3600 } // ✨ Cache por 1 hora
);
```

**Benefícios:**
- ✅ Settings em memória
- ✅ Sem query ao database
- ✅ Resposta instantânea

---

### **FASE 4: OTIMIZAÇÃO DE ASSETS** (Impacto: 5%)

#### **4.1 Code Splitting**

**Implementar:**
```tsx
// Carregar componentes pesados apenas quando necessário
const ThermographyIllustration = dynamic(
  () => import('@/components/thermography-illustration'),
  { ssr: false, loading: () => <div>Carregando...</div> }
);

const ArticleCard = dynamic(
  () => import('@/components/article-card'),
  { ssr: false }
);
```

**Benefícios:**
- ✅ JavaScript dividido em chunks
- ✅ Carrega apenas o necessário
- ✅ Bundle inicial menor

---

#### **4.2 Minificar e Comprimir**

**Next.js Config:**
```javascript
// next.config.js
module.exports = {
  compress: true,  // ✨ Gzip/Brotli
  swcMinify: true, // ✨ Minificação rápida
  
  images: {
    formats: ['image/avif', 'image/webp'], // ✨ Formatos modernos
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },
  
  experimental: {
    optimizeCss: true, // ✨ Otimizar CSS
  }
};
```

**Benefícios:**
- ✅ Assets 60-70% menores
- ✅ Transfer mais rápido
- ✅ Menos banda

---

## 📊 IMPACTO ESPERADO

### **Antes da Otimização:**
```
Homepage Load Time: >30s ❌
First Contentful Paint: ~15s ❌
Largest Contentful Paint: ~25s ❌
Time to Interactive: >30s ❌
Total Bundle Size: ~5MB ❌
```

### **Depois da Otimização:**
```
Homepage Load Time: <3s ✅ (90% mais rápido)
First Contentful Paint: <1s ✅
Largest Contentful Paint: <2.5s ✅
Time to Interactive: <3s ✅
Total Bundle Size: <500KB ✅ (90% menor)
```

---

## 🔧 IMPLEMENTAÇÃO PASSO A PASSO

### **PASSO 1: Otimizar Imagens** (30 min)

```bash
# 1. Instalar dependências
npm install sharp

# 2. Criar script de otimização
# scripts/optimize-images.js

# 3. Executar otimização
node scripts/optimize-images.js

# 4. Atualizar componentes
# - Reduzir quality de 70 para 60
# - Adicionar placeholder="blur"
# - Adicionar priority={false}
```

---

### **PASSO 2: Implementar SSG** (20 min)

```tsx
// 1. Remover "use client" do componente principal
// 2. Adicionar revalidate
export const revalidate = 3600;

// 3. Converter para async function
export default async function HomePage() {
  const settings = await getSettings();
  const articles = await getArticles();
  return <LandingPage settings={settings} articles={articles} />;
}
```

---

### **PASSO 3: Lazy Loading** (15 min)

```tsx
// 1. Instalar react-lazy-load-image-component
npm install react-lazy-load-image-component

// 2. Envolver artigos em LazyLoad
import { LazyLoadComponent } from 'react-lazy-load-image-component';

<LazyLoadComponent>
  <ArticleCard article={article} />
</LazyLoadComponent>
```

---

### **PASSO 4: Otimizar Queries** (15 min)

```typescript
// 1. Reduzir campos retornados
// 2. Limitar quantidade (take: 3)
// 3. Adicionar cache

const getArticles = unstable_cache(
  async () => {
    return await prisma.article.findMany({
      take: 3,
      select: { /* apenas necessário */ }
    });
  },
  ['homepage-articles'],
  { revalidate: 3600 }
);
```

---

### **PASSO 5: Code Splitting** (10 min)

```tsx
// 1. Usar dynamic import para componentes pesados
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false,
  loading: () => <Skeleton />
});
```

---

## 📈 MÉTRICAS DE SUCESSO

### **Lighthouse Score:**
```
Antes:
- Performance: 20 ❌
- Accessibility: 85 🟡
- Best Practices: 75 🟡
- SEO: 90 ✅

Depois:
- Performance: 90+ ✅
- Accessibility: 95+ ✅
- Best Practices: 95+ ✅
- SEO: 95+ ✅
```

### **Core Web Vitals:**
```
Antes:
- LCP: 25s ❌
- FID: 300ms ❌
- CLS: 0.5 ❌

Depois:
- LCP: <2.5s ✅
- FID: <100ms ✅
- CLS: <0.1 ✅
```

---

## 🎯 PRIORIZAÇÃO

### **CRÍTICO (Fazer Agora):**
1. ✅ Otimizar imagens (quality 60)
2. ✅ Implementar SSG (revalidate)
3. ✅ Lazy loading de artigos

### **IMPORTANTE (Esta Semana):**
4. ✅ Comprimir imagens existentes
5. ✅ Cache de settings
6. ✅ Code splitting

### **DESEJÁVEL (Próxima Semana):**
7. ✅ Converter para Server Components
8. ✅ Otimizar queries
9. ✅ Configurar CDN

---

## 💡 QUICK WINS (5 minutos cada)

### **1. Reduzir Quality de Imagens:**
```tsx
// Mudar de quality={70} para quality={60}
<Image quality={60} />
```

### **2. Adicionar Revalidate:**
```tsx
// Adicionar no topo da página
export const revalidate = 3600;
```

### **3. Limitar Artigos:**
```typescript
// Mudar de findMany() para findMany({ take: 3 })
const articles = await prisma.article.findMany({ take: 3 });
```

---

## 🔍 MONITORAMENTO

### **Ferramentas:**
```bash
# 1. Lighthouse
npm run build
npm run start
# Abrir Chrome DevTools > Lighthouse

# 2. Bundle Analyzer
npm install @next/bundle-analyzer
# Adicionar ao next.config.js

# 3. Performance Monitoring
# Adicionar Vercel Analytics ou similar
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Reduzir quality de imagens para 60
- [ ] Adicionar placeholder="blur"
- [ ] Implementar lazy loading
- [ ] Adicionar revalidate = 3600
- [ ] Limitar artigos para 3
- [ ] Comprimir imagens com sharp
- [ ] Adicionar cache de settings
- [ ] Implementar code splitting
- [ ] Testar com Lighthouse
- [ ] Validar Core Web Vitals
- [ ] Deploy e monitorar

---

## 🎉 RESULTADO ESPERADO

**Antes:** Homepage em 30+ segundos ❌  
**Depois:** Homepage em <3 segundos ✅  

**Melhoria:** 90% mais rápido! 🚀

---

**Quer que eu comece a implementar?** 🛠️
