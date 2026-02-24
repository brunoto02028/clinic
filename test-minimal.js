const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type()==='error') errors.push(msg.text()); });

  // Login and get to admin
  await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'admin@bpr.rehab');
  await page.type('input[type="password"]', 'Bruno@Admin2026!');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null)
  ]);
  await new Promise(r => setTimeout(r, 3000));

  // Full page load /admin (works)
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Admin loaded OK');
  errors.length = 0;

  // Test 1: Client-side nav to minimal test page
  console.log('\n=== TEST 1: Client-side nav to /admin/test-nav ===');
  await page.evaluate(() => {
    const a = document.createElement('a');
    a.href = '/admin/test-nav';
    // Use Next.js Link behavior by dispatching click on existing page
    window.history.pushState({}, '', '/admin/test-nav');
  });
  // Actually, let me use Next.js router directly
  await page.evaluate(() => {
    // Trigger a proper Next.js client-side navigation
    const evt = new PopStateEvent('popstate');
    window.dispatchEvent(evt);
  });
  await new Promise(r => setTimeout(r, 3000));
  
  // Better approach: inject a link and click it
  errors.length = 0;
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  errors.length = 0;
  
  await page.evaluate(() => {
    // Create a temporary Next Link-like click
    const link = document.querySelector('a[href="/admin/patients"]') || document.querySelector('a[href^="/admin"]');
    // Rewrite link href temporarily
    if (link) {
      const origHref = link.getAttribute('href');
      link.setAttribute('href', '/admin/test-nav');
      link.click();
      // Restore (though nav already started)
      link.setAttribute('href', origHref);
    }
  });
  await new Promise(r => setTimeout(r, 4000));
  
  console.log('URL:', page.url());
  const body = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  const hasErr = body.includes('Application error');
  console.log('Application error:', hasErr);
  console.log('Page content:', body.substring(0, 200));
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log('  -', typeof e === 'string' ? e.substring(0, 200) : e));

  // Test 2: Full page load of /admin/test-nav (should work)
  console.log('\n=== TEST 2: Full page load /admin/test-nav ===');
  errors.length = 0;
  await page.goto('https://bpr.rehab/admin/test-nav', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('URL:', page.url());
  const body2 = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  console.log('Application error:', body2.includes('Application error'));
  console.log('Page content:', body2.substring(0, 200));

  // Test 3: From test-nav page, client-side nav to /admin
  console.log('\n=== TEST 3: Client-side nav from /admin/test-nav to /admin ===');
  errors.length = 0;
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin"]');
    if (link) link.click();
    else console.log('No link found');
  });
  await new Promise(r => setTimeout(r, 4000));
  console.log('URL:', page.url());
  const body3 = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  console.log('Application error:', body3.includes('Application error'));
  console.log('Errors:', errors.length);
  errors.forEach(e => console.log('  -', typeof e === 'string' ? e.substring(0, 200) : e));

  await browser.close();
  process.exit(0);
})();
