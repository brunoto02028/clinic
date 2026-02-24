const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const warnings = [];
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
  });
  const page = await browser.newPage();
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(`[WARN] ${msg.text()}`);
    }
  });
  
  // Capture page errors (uncaught exceptions)
  page.on('pageerror', err => {
    errors.push(`[PAGE_ERROR] ${err.message}`);
  });

  // 1. Navigate to homepage
  console.log('\n=== STEP 1: Navigate to https://bpr.rehab ===');
  try {
    await page.goto('https://bpr.rehab', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Check for "Application error" text
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
    if (bodyText && bodyText.includes('Application error')) {
      console.log('!!! APPLICATION ERROR DETECTED ON HOMEPAGE !!!');
      console.log('Body text:', bodyText.substring(0, 300));
    } else {
      console.log('Homepage loaded OK (no Application error)');
    }
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  
  console.log('\nErrors so far:', errors.length);
  errors.forEach(e => console.log('  ', e.substring(0, 200)));

  // 2. Navigate to login
  console.log('\n=== STEP 2: Navigate to /login ===');
  try {
    await page.goto('https://bpr.rehab/login', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page URL:', page.url());
    
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
    if (bodyText && bodyText.includes('Application error')) {
      console.log('!!! APPLICATION ERROR ON LOGIN PAGE !!!');
    } else {
      console.log('Login page loaded OK');
    }
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  // 3. Login
  console.log('\n=== STEP 3: Login with admin credentials ===');
  try {
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.type('input[type="email"], input[name="email"]', 'brunotoaz@gmail.com');
    await page.type('input[type="password"], input[name="password"]', 'Admin123!');
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('After login URL:', page.url());
    
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
    if (bodyText && bodyText.includes('Application error')) {
      console.log('!!! APPLICATION ERROR AFTER LOGIN !!!');
      console.log('Body text:', bodyText.substring(0, 300));
    } else {
      console.log('Admin page loaded OK');
      console.log('Body preview:', bodyText?.substring(0, 200));
    }
  } catch (e) {
    console.log('Login error:', e.message);
    // Take screenshot for debugging
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500));
    console.log('Current URL:', page.url());
    console.log('Body text:', bodyText?.substring(0, 300));
  }

  // Wait a bit for any async errors
  await new Promise(r => setTimeout(r, 5000));

  // 4. Try navigating to admin subpages
  console.log('\n=== STEP 4: Navigate to /admin directly ===');
  try {
    await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Admin URL:', page.url());
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 300));
    if (bodyText && bodyText.includes('Application error')) {
      console.log('!!! APPLICATION ERROR ON /admin !!!');
    } else {
      console.log('Admin page OK');
    }
  } catch (e) {
    console.log('Admin nav error:', e.message);
  }

  // Wait for any late errors
  await new Promise(r => setTimeout(r, 3000));

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Total errors: ${errors.length}`);
  errors.forEach((e, i) => console.log(`  Error ${i+1}: ${e.substring(0, 300)}`));
  console.log(`Total warnings: ${warnings.length}`);
  warnings.slice(0, 5).forEach((w, i) => console.log(`  Warn ${i+1}: ${w.substring(0, 200)}`));
  
  await browser.close();
  process.exit(0);
})();
