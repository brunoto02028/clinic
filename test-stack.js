const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => { 
    console.log('=== PAGE ERROR ===');
    console.log('Message:', err.message);
    console.log('Stack:', err.stack);
  });

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
  console.log('Logged in, URL:', page.url());

  // Full page reload on /admin to get clean state
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Admin loaded OK');

  // Now click a sidebar link to trigger client-side navigation
  console.log('\n=== Clicking /admin/patients ===');
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/patients"]');
    if (link) link.click();
  });
  await new Promise(r => setTimeout(r, 5000));
  
  const hasErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Application error:', hasErr);

  // Also try to get the error from __NEXT_DATA__ or React error overlay
  const nextData = await page.evaluate(() => {
    try { return JSON.stringify(window.__NEXT_DATA__?.err || null); } catch { return 'N/A'; }
  });
  console.log('Next error data:', nextData);

  // Check if the page source has any useful error info
  const errorText = await page.evaluate(() => {
    const el = document.querySelector('[data-nextjs-dialog]') || document.querySelector('.nextjs-container-errors-body');
    return el ? el.innerText : 'no error overlay';
  });
  console.log('Error overlay:', errorText);

  await browser.close();
  process.exit(0);
})();
