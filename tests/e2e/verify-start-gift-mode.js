/**
 * Verificação pontual: confirma que o modo "gift card" (?via=card) da página
 * /start troca a linguagem corretamente (headline, CTA, badge) sem quebrar o
 * modo padrão, e que a linha de urgência + link de WhatsApp aparecem no hero.
 * Script temporário — pode ser apagado após confirmação.
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function checkPage(browser, path, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 1000 });

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log(`\nNavegando para ${BASE_URL}${path} (${label}) ...`);
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0', timeout: 30000 });

  const data = await page.evaluate(() => {
    const bodyText = document.body.textContent || "";
    const heroCta = document.querySelector('header a[href^="/signup"]');
    const waLink = document.querySelector('a[href*="wa.me"]');
    return {
      hasGiftHeadline: bodyText.includes('worth one full assessment') || bodyText.includes('vale uma avaliação completa'),
      hasDefaultHeadline: bodyText.includes('Find the real cause') || bodyText.includes('Descubra a causa real'),
      hasRedeemCta: bodyText.includes('Redeem My Assessment') || bodyText.includes('Resgatar Minha Avaliação'),
      hasClaimCta: bodyText.includes('Claim My Free Assessment') || bodyText.includes('Quero a Minha Avaliação Gratuita'),
      hasUrgencyLine: bodyText.includes('limited each week') || bodyText.includes('limitadas a cada semana'),
      hasHealingWithHeart: bodyText.includes('Healing With Heart') || bodyText.includes('Curar com Coração'),
      hasTestimonials: bodyText.includes('What patients say') || bodyText.includes('O que dizem os pacientes'),
      heroCtaHref: heroCta ? heroCta.getAttribute('href') : null,
      hasHeroWhatsApp: !!waLink,
    };
  });

  console.log(`Resultado (${label}):`, JSON.stringify(data, null, 2));
  if (consoleErrors.length) {
    console.log(`⚠️  Console errors (${label}):`, consoleErrors.slice(0, 5));
  }

  const screenshotPath = `/tmp/start-${label}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot guardado em ${screenshotPath}`);

  await page.close();
  return data;
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let failed = false;

  try {
    const normal = await checkPage(browser, '/start', 'default');
    if (!normal.hasDefaultHeadline || normal.hasGiftHeadline || !normal.hasClaimCta || normal.hasRedeemCta) {
      console.log('❌ Modo padrão não está mostrando a copy esperada.');
      failed = true;
    } else {
      console.log('✅ Modo padrão OK (headline + CTA corretos, sem linguagem de gift).');
    }
    if (!normal.hasUrgencyLine) {
      console.log('❌ Linha de urgência ausente no modo padrão.');
      failed = true;
    } else {
      console.log('✅ Linha de urgência presente.');
    }
    if (!normal.hasHeroWhatsApp) {
      console.log('⚠️  Link de WhatsApp ausente no hero — depende de settings.whatsappEnabled no admin (não é bug de código).');
    } else {
      console.log('✅ Link de WhatsApp visível no hero.');
    }
    if (normal.heroCtaHref !== '/signup') {
      console.log(`❌ CTA do hero devia apontar para /signup, encontrado: ${normal.heroCtaHref}`);
      failed = true;
    }
    if (!normal.hasHealingWithHeart) {
      console.log('❌ Badge "Healing With Heart" ausente no modo padrão.');
      failed = true;
    } else {
      console.log('✅ Badge "Healing With Heart" presente.');
    }
    if (!normal.hasTestimonials) {
      console.log('❌ Secção de testemunhos (placeholder) não apareceu.');
      failed = true;
    } else {
      console.log('✅ Secção de testemunhos (placeholder) visível para preview de layout.');
    }

    const gift = await checkPage(browser, '/start?via=card', 'gift');
    if (!gift.hasGiftHeadline || gift.hasDefaultHeadline || !gift.hasRedeemCta || gift.hasClaimCta) {
      console.log('❌ Modo gift não está mostrando a copy esperada.');
      failed = true;
    } else {
      console.log('✅ Modo gift OK (headline + CTA trocados corretamente).');
    }
    if (gift.heroCtaHref !== '/signup?via=card') {
      console.log(`❌ CTA do hero em modo gift devia apontar para /signup?via=card, encontrado: ${gift.heroCtaHref}`);
      failed = true;
    } else {
      console.log('✅ ?via=card persistido corretamente no link para /signup.');
    }
    if (!gift.hasHealingWithHeart) {
      console.log('❌ Badge "Healing With Heart" desapareceu no modo gift (deveria manter-se sempre).');
      failed = true;
    } else {
      console.log('✅ Badge "Healing With Heart" mantido no modo gift.');
    }
  } finally {
    await browser.close();
  }

  if (failed) {
    console.log('\n❌ Verificação falhou — ver detalhes acima.');
    process.exitCode = 1;
  } else {
    console.log('\n✅ Todas as verificações passaram.');
  }
}

run().catch((err) => {
  console.error('Erro no teste:', err);
  process.exitCode = 1;
});
