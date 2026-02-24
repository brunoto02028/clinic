const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  page.on('pageerror', err => errors.push(err.message));

  // Test 1: Homepage - check hero section renders from settings, no logo flash SVG
  console.log('=== TEST 1: Homepage ===');
  await page.goto('https://bpr.rehab', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  const heroText = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    return h1 ? h1.innerText : 'NO H1 FOUND';
  });
  console.log('Hero H1:', heroText);
  
  // Check no SVG fallback logo visible (should show real logo)
  const hasSvgLogo = await page.evaluate(() => {
    const svgs = document.querySelectorAll('header svg[viewBox="0 0 100 100"]');
    return svgs.length;
  });
  console.log('SVG fallback logos in header:', hasSvgLogo, hasSvgLogo === 0 ? '(GOOD - no flash)' : '(BAD - fallback showing)');
  
  const homeErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Homepage error:', homeErr);

  // Test 2: Admin login and sidebar check
  console.log('\n=== TEST 2: Admin login + sidebar ===');
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
  
  // Check sidebar items are alphabetically sorted in Clinic group
  const clinicItems = await page.evaluate(() => {
    const items = [];
    // Find all sidebar links
    const links = document.querySelectorAll('aside a, nav a, [class*="sidebar"] a');
    links.forEach(l => {
      const text = l.innerText?.trim();
      if (text && text.length > 0 && text.length < 30) items.push(text);
    });
    return items;
  });
  console.log('Sidebar items (first 10):', clinicItems.slice(0, 10));

  // Test 3: Client-side navigation still works
  console.log('\n=== TEST 3: Client-side nav ===');
  errors.length = 0;
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/patients"]');
    if (link) link.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  const navErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Nav to patients - error:', navErr, '| Console errors:', errors.length);

  // Test 4: Settings page loads
  console.log('\n=== TEST 4: Settings page ===');
  errors.length = 0;
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/settings"]');
    if (link) link.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  const settingsErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  console.log('Settings page - error:', settingsErr, '| Console errors:', errors.length);

  console.log('\n========== DONE ==========');
  await browser.close();
  process.exit(0);
})();
