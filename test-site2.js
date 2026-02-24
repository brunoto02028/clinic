const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const consoleMessages = [];
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    const entry = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleMessages.push(entry);
    if (msg.type() === 'error') errors.push(entry);
  });
  page.on('pageerror', err => {
    errors.push(`[PAGE_ERROR] ${err.message}`);
  });

  // 1. Homepage
  console.log('=== STEP 1: Homepage ===');
  await page.goto('https://bpr.rehab', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('URL:', page.url());
  const homeBody = await page.evaluate(() => document.body?.innerText?.substring(0, 200));
  console.log('OK - errors:', errors.length);
  if (homeBody.includes('Application error')) console.log('!!! APP ERROR !!!');

  // 2. Login with correct credentials
  console.log('\n=== STEP 2: Login ===');
  await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  
  // Try admin@bpr.rehab first
  await page.type('input[type="email"], input[name="email"]', 'brunotoaz@gmail.com');
  await page.type('input[type="password"], input[name="password"]', 'Admin123!');
  
  const errsBefore = errors.length;
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null)
  ]);
  
  await new Promise(r => setTimeout(r, 3000));
  console.log('After login URL:', page.url());
  
  let body = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  if (body.includes('Invalid')) {
    console.log('Login failed with brunotoaz - trying admin@bpr.rehab');
    // Clear and retry
    await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', 'admin@bpr.rehab');
    await page.type('input[type="password"], input[name="password"]', 'Bruno@Admin2026!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null)
    ]);
    await new Promise(r => setTimeout(r, 3000));
    console.log('After login URL:', page.url());
    body = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
  }
  
  if (body.includes('Application error')) {
    console.log('!!! APPLICATION ERROR AFTER LOGIN !!!');
  } else if (body.includes('Invalid')) {
    console.log('Login still failed - both credentials invalid');
  } else {
    console.log('Login successful! Page preview:', body.substring(0, 150));
  }
  
  const newErrs = errors.slice(errsBefore);
  console.log('New errors after login:', newErrs.length);
  newErrs.forEach(e => console.log('  ', e.substring(0, 250)));

  // 3. Wait and check admin page
  await new Promise(r => setTimeout(r, 3000));
  
  if (page.url().includes('/admin')) {
    console.log('\n=== STEP 3: Admin page loaded ===');
    console.log('URL:', page.url());
    body = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
    if (body.includes('Application error')) {
      console.log('!!! APPLICATION ERROR ON ADMIN !!!');
    } else {
      console.log('Admin OK! Preview:', body.substring(0, 200));
    }
    
    // Navigate to a subpage
    console.log('\n=== STEP 4: Admin subpage /admin/patients ===');
    await page.goto('https://bpr.rehab/admin/patients', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    body = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
    console.log('URL:', page.url());
    if (body.includes('Application error')) {
      console.log('!!! APPLICATION ERROR ON /admin/patients !!!');
    } else {
      console.log('Patients page OK!');
    }
  }

  // Final summary
  await new Promise(r => setTimeout(r, 2000));
  console.log('\n========== FINAL SUMMARY ==========');
  console.log(`Total console errors: ${errors.length}`);
  errors.forEach((e, i) => console.log(`  ${i+1}. ${e.substring(0, 300)}`));
  
  await browser.close();
  process.exit(0);
})();
