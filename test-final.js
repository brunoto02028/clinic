const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  page.on('pageerror', err => errors.push(`[PAGEERROR] ${err.message}`));
  page.on('console', msg => { if (msg.type()==='error') errors.push(msg.text()); });

  // Login
  console.log('=== Login ===');
  await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'admin@bpr.rehab');
  await page.type('input[type="password"]', 'Bruno@Admin2026!');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null)
  ]);
  await new Promise(r => setTimeout(r, 3000));
  console.log('Logged in, URL:', page.url());
  const loginErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Login->Admin error:', loginErr);

  // Full page load /admin
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('\n=== Admin dashboard (full load) ===');
  console.log('Error:', await page.evaluate(() => document.body?.innerText?.includes('Application error')));
  
  // Client-side navigations
  const navTests = [
    '/admin/patients',
    '/admin/articles', 
    '/admin/appointments',
    '/admin/settings',
    '/admin',
  ];

  for (const href of navTests) {
    errors.length = 0;
    console.log(`\n=== Client-side nav to ${href} ===`);
    
    const clicked = await page.evaluate((h) => {
      const links = document.querySelectorAll(`a[href="${h}"]`);
      if (links.length) { links[0].click(); return true; }
      return false;
    }, href);
    
    if (!clicked) {
      console.log('  (no link found, using goto)');
      await page.goto('https://bpr.rehab' + href, { waitUntil: 'networkidle2', timeout: 15000 });
    }
    await new Promise(r => setTimeout(r, 3000));
    
    const hasErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
    console.log(`  URL: ${page.url()} | Error: ${hasErr} | Console errors: ${errors.length}`);
    if (errors.length) errors.forEach(e => console.log('    -', e.substring(0, 200)));
  }

  // Homepage test
  console.log('\n=== Homepage ===');
  errors.length = 0;
  await page.goto('https://bpr.rehab', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  const homeErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log(`  Error: ${homeErr} | Console errors: ${errors.length}`);

  console.log('\n========== ALL TESTS DONE ==========');
  await browser.close();
  process.exit(0);
})();
