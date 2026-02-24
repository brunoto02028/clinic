const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      errors.push({ text: text.substring(0, 500), url: page.url(), time: new Date().toISOString() });
    }
  });
  page.on('pageerror', err => {
    errors.push({ text: `[PAGEERROR] ${err.message.substring(0, 500)}`, url: page.url(), time: new Date().toISOString() });
  });

  // Login directly
  console.log('=== Login ===');
  await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'admin@bpr.rehab');
  await page.type('input[type="password"]', 'Bruno@Admin2026!');
  
  console.log('Submitting login...');
  errors.length = 0; // clear any login page errors
  
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null)
  ]);
  
  console.log('After login URL:', page.url());
  await new Promise(r => setTimeout(r, 5000));
  
  // Check page content
  const hasError = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error on page:', hasError);
  
  // Get page HTML to check for hydration issues
  const html = await page.evaluate(() => document.documentElement.outerHTML.substring(0, 2000));
  if (hasError) {
    console.log('\nPage HTML preview (first 1000 chars):\n', html.substring(0, 1000));
  }
  
  // Check what Next.js error info is available
  const nextError = await page.evaluate(() => {
    const el = document.getElementById('__next');
    return el ? el.innerHTML.substring(0, 500) : 'no __next element';
  });
  console.log('\n__next content:', nextError.substring(0, 300));

  console.log('\n=== Errors captured ===');
  errors.forEach((e, i) => console.log(`${i+1}. [${e.time}] URL:${e.url}\n   ${e.text}\n`));

  // Try a hard refresh on /admin
  console.log('\n=== Hard refresh on /admin ===');
  errors.length = 0;
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  
  const hasError2 = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error on hard refresh:', hasError2);
  
  console.log('\nErrors on hard refresh:');
  errors.forEach((e, i) => console.log(`${i+1}. ${e.text.substring(0, 300)}\n`));

  // Now test /admin/patients (which works)
  console.log('\n=== /admin/patients ===');
  errors.length = 0;
  await page.goto('https://bpr.rehab/admin/patients', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const hasError3 = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error on /admin/patients:', hasError3);
  console.log('Errors:', errors.length);

  await browser.close();
  process.exit(0);
})();
