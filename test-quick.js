const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type()==='error') errors.push(msg.text()); });

  // Login
  await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'admin@bpr.rehab');
  await page.type('input[type="password"]', 'Bruno@Admin2026!');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null)
  ]);
  await new Promise(r => setTimeout(r, 3000));
  
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  errors.length = 0;

  // Client-side nav
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/patients"]');
    if (link) link.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  
  const hasErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error:', hasErr, '| Errors:', errors.length);
  errors.forEach(e => console.log('  -', e.substring(0, 200)));

  await browser.close();
  process.exit(0);
})();
