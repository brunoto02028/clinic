const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => { 
    errors.push({ text: err.message, stack: err.stack || '', url: page.url() }); 
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const args = msg.args();
      errors.push({ text: msg.text().substring(0, 600), url: page.url() });
    }
  });

  // Go directly to /admin (full page load - works)
  console.log('=== Full page load /admin ===');
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  // Will redirect to login if not authenticated
  if (page.url().includes('/login')) {
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'admin@bpr.rehab');
    await page.type('input[type="password"]', 'Bruno@Admin2026!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null)
    ]);
    await new Promise(r => setTimeout(r, 3000));
  }
  console.log('URL:', page.url());

  // Check current locale in localStorage
  const localeLs = await page.evaluate(() => localStorage.getItem('clinic-locale'));
  console.log('localStorage clinic-locale:', localeLs);

  // Test 1: Set locale to "en-GB" (matching server default) and try navigating
  console.log('\n=== TEST 1: Set locale to en-GB then navigate ===');
  await page.evaluate(() => localStorage.setItem('clinic-locale', 'en-GB'));
  // Full reload to apply
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  errors.length = 0;
  
  // Click a link
  const clicked1 = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href="/admin/patients"]');
    if (links.length) { links[0].click(); return true; }
    return false;
  });
  console.log('Clicked patients link:', clicked1);
  await new Promise(r => setTimeout(r, 4000));
  console.log('URL:', page.url());
  const err1 = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error with en-GB:', err1);
  console.log('Errors with en-GB:', errors.length);
  errors.forEach(e => console.log('  ', e.text.substring(0, 300)));

  // Test 2: Set locale to "pt-BR" (different from server default) and try navigating
  console.log('\n=== TEST 2: Set locale to pt-BR then navigate ===');
  errors.length = 0;
  await page.evaluate(() => localStorage.setItem('clinic-locale', 'pt-BR'));
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  errors.length = 0;
  
  const clicked2 = await page.evaluate(() => {
    const links = document.querySelectorAll('a[href="/admin/patients"]');
    if (links.length) { links[0].click(); return true; }
    return false;
  });
  console.log('Clicked patients link:', clicked2);
  await new Promise(r => setTimeout(r, 4000));
  console.log('URL:', page.url());
  const err2 = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error with pt-BR:', err2);
  console.log('Errors with pt-BR:', errors.length);
  errors.forEach(e => {
    console.log('  TEXT:', e.text.substring(0, 300));
    if (e.stack) console.log('  STACK:', e.stack.substring(0, 500));
  });

  await browser.close();
  process.exit(0);
})();
