/**
 * Performance Test Script
 * Testa o carregamento da home page usando Playwright (mais leve que Puppeteer)
 */

const { chromium } = require('playwright');

async function testPerformance() {
  console.log('🚀 Iniciando teste de performance...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Métricas de performance
  const metrics = {
    startTime: Date.now(),
    logoLoadTime: null,
    heroImageLoadTime: null,
    firstContentfulPaint: null,
    domContentLoaded: null,
    loadComplete: null,
    totalImages: 0,
    imagesLoaded: 0,
  };

  // Monitorar requisições de imagens
  page.on('response', async (response) => {
    const url = response.url();
    
    if (url.includes('logo') || url.includes('Logo')) {
      const loadTime = Date.now() - metrics.startTime;
      if (!metrics.logoLoadTime) {
        metrics.logoLoadTime = loadTime;
        console.log(`✅ Logo carregado em: ${loadTime}ms`);
      }
    }
    
    if (response.request().resourceType() === 'image') {
      metrics.imagesLoaded++;
      const loadTime = Date.now() - metrics.startTime;
      
      // Detectar hero image (primeira imagem grande)
      if (!metrics.heroImageLoadTime && metrics.imagesLoaded === 1) {
        metrics.heroImageLoadTime = loadTime;
        console.log(`✅ Hero image carregada em: ${loadTime}ms`);
      }
    }
  });

  // Navegar para a página
  console.log('📍 Acessando https://bpr.rehab...\n');
  
  try {
    await page.goto('https://bpr.rehab', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    metrics.domContentLoaded = Date.now() - metrics.startTime;
    console.log(`✅ DOM carregado em: ${metrics.domContentLoaded}ms`);

    // Aguardar load completo
    await page.waitForLoadState('load', { timeout: 30000 });
    metrics.loadComplete = Date.now() - metrics.startTime;
    console.log(`✅ Página completamente carregada em: ${metrics.loadComplete}ms`);

    // Aguardar um pouco mais para imagens lazy
    await page.waitForTimeout(2000);

    // Capturar métricas de performance do navegador
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      const paintData = performance.getEntriesByType('paint');
      
      return {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        ttfb: perfData.responseStart - perfData.requestStart,
        download: perfData.responseEnd - perfData.responseStart,
        domInteractive: perfData.domInteractive,
        domComplete: perfData.domComplete,
        fcp: paintData.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        lcp: paintData.find(p => p.name === 'largest-contentful-paint')?.startTime || 0,
      };
    });

    // Screenshot
    await page.screenshot({ path: 'performance-test-screenshot.png', fullPage: false });
    console.log('\n📸 Screenshot salvo: performance-test-screenshot.png');

    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE PERFORMANCE');
    console.log('='.repeat(60));
    console.log(`\n🎯 MÉTRICAS CRÍTICAS:`);
    console.log(`   Logo:        ${metrics.logoLoadTime || 'N/A'}ms ${metrics.logoLoadTime && metrics.logoLoadTime < 500 ? '✅' : '⚠️'}`);
    console.log(`   Hero Image:  ${metrics.heroImageLoadTime || 'N/A'}ms ${metrics.heroImageLoadTime && metrics.heroImageLoadTime < 1000 ? '✅' : '⚠️'}`);
    console.log(`   FCP:         ${Math.round(performanceMetrics.fcp)}ms ${performanceMetrics.fcp < 1800 ? '✅' : '⚠️'}`);
    console.log(`\n⏱️  TEMPOS DE CARREGAMENTO:`);
    console.log(`   DNS Lookup:  ${Math.round(performanceMetrics.dns)}ms`);
    console.log(`   TCP Connect: ${Math.round(performanceMetrics.tcp)}ms`);
    console.log(`   TTFB:        ${Math.round(performanceMetrics.ttfb)}ms`);
    console.log(`   Download:    ${Math.round(performanceMetrics.download)}ms`);
    console.log(`   DOM Ready:   ${metrics.domContentLoaded}ms`);
    console.log(`   Load:        ${metrics.loadComplete}ms`);
    console.log(`\n🖼️  IMAGENS:`);
    console.log(`   Carregadas:  ${metrics.imagesLoaded}`);
    
    console.log(`\n📈 AVALIAÇÃO GERAL:`);
    const score = calculateScore(metrics, performanceMetrics);
    console.log(`   Score:       ${score}/100 ${getScoreEmoji(score)}`);
    console.log(`   Status:      ${getStatus(score)}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    await browser.close();
  }
}

function calculateScore(metrics, perfMetrics) {
  let score = 100;
  
  // Logo (peso 20)
  if (metrics.logoLoadTime > 500) score -= 10;
  else if (metrics.logoLoadTime > 200) score -= 5;
  
  // Hero (peso 20)
  if (metrics.heroImageLoadTime > 1000) score -= 10;
  else if (metrics.heroImageLoadTime > 500) score -= 5;
  
  // FCP (peso 30)
  if (perfMetrics.fcp > 2500) score -= 20;
  else if (perfMetrics.fcp > 1800) score -= 10;
  else if (perfMetrics.fcp > 1000) score -= 5;
  
  // Load (peso 30)
  if (metrics.loadComplete > 5000) score -= 20;
  else if (metrics.loadComplete > 3000) score -= 10;
  else if (metrics.loadComplete > 2000) score -= 5;
  
  return Math.max(0, score);
}

function getScoreEmoji(score) {
  if (score >= 90) return '🚀';
  if (score >= 70) return '✅';
  if (score >= 50) return '⚠️';
  return '❌';
}

function getStatus(score) {
  if (score >= 90) return 'EXCELENTE - Carregamento ultra-rápido!';
  if (score >= 70) return 'BOM - Performance satisfatória';
  if (score >= 50) return 'REGULAR - Precisa melhorias';
  return 'RUIM - Otimização urgente necessária';
}

// Executar teste
testPerformance().catch(console.error);
