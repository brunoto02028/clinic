/**
 * Verificação pontual: confirma que a foto do Bruno carrega corretamente
 * em https://bpr.rehab/start (regressão do next/image em produção).
 * Script temporário — pode ser apagado após confirmação.
 */

const puppeteer = require('puppeteer');

const URL = process.env.TEST_URL || 'https://bpr.rehab/start';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 480, height: 900 });

    console.log(`Navegando para ${URL} ...`);
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // A foto do Bruno é a primeira <img> dentro do <header> do hero
    const imgInfo = await page.evaluate(() => {
      const img = document.querySelector('header img[alt="Bruno"]');
      if (!img) return { found: false };
      return {
        found: true,
        src: img.currentSrc || img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
      };
    });

    console.log('Resultado:', JSON.stringify(imgInfo, null, 2));

    if (!imgInfo.found) {
      console.log('❌ Elemento <img alt="Bruno"> não encontrado no hero.');
      process.exitCode = 1;
    } else if (imgInfo.naturalWidth > 0 && imgInfo.naturalHeight > 0) {
      console.log(`✅ Foto carregada corretamente (${imgInfo.naturalWidth}x${imgInfo.naturalHeight}px).`);
    } else {
      console.log('❌ Foto encontrada mas com dimensões 0 (imagem partida).');
      process.exitCode = 1;
    }

    const screenshotPath = '/tmp/start-page-verify.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot guardado em ${screenshotPath}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Erro no teste:', err);
  process.exitCode = 1;
});
