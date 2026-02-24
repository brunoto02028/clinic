const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();

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

  // Full page load of /admin
  await page.goto('https://bpr.rehab/admin', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Admin loaded. Injecting error interceptor...');

  // Monkey-patch to capture full error objects with stacks
  await page.evaluate(() => {
    window.__capturedErrors = [];
    const origError = console.error;
    console.error = function(...args) {
      for (const a of args) {
        if (a instanceof Error) {
          window.__capturedErrors.push({ message: a.message, stack: a.stack, name: a.name });
        } else if (typeof a === 'string' && a.includes('removeChild')) {
          window.__capturedErrors.push({ message: a, stack: new Error().stack });
        }
      }
      origError.apply(console, args);
    };
    // Also catch unhandled errors
    window.addEventListener('error', (e) => {
      window.__capturedErrors.push({ message: e.message, stack: e.error?.stack || 'no stack', filename: e.filename, lineno: e.lineno });
    });
  });

  // Click sidebar link
  console.log('Clicking /admin/patients...');
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/admin/patients"]');
    if (link) link.click();
  });
  await new Promise(r => setTimeout(r, 5000));

  // Retrieve captured errors
  const captured = await page.evaluate(() => window.__capturedErrors);
  console.log(`\nCaptured ${captured.length} errors:`);
  captured.forEach((e, i) => {
    console.log(`\n--- Error ${i+1} ---`);
    console.log('Message:', e.message?.substring(0, 300));
    console.log('Stack:', (e.stack || 'none').substring(0, 1000));
    if (e.filename) console.log('File:', e.filename, 'Line:', e.lineno);
  });

  await browser.close();
  process.exit(0);
})();
