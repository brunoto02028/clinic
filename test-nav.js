const puppeteer = require('puppeteer');

(async () => {
  const errors = [];
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-extensions'] });
  const page = await browser.newPage();
  
  page.on('console', msg => { if (msg.type()==='error') errors.push({text:msg.text().substring(0,400),url:page.url()}); });
  page.on('pageerror', err => { errors.push({text:`[PAGEERROR] ${err.message.substring(0,400)}`,url:page.url()}); });

  // Login via full page load (which works)
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
  
  const hasErr = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
  if (hasErr) { console.log('ERROR on admin dashboard!'); }
  else { console.log('Admin dashboard OK'); }

  // Now click sidebar links to navigate between pages
  const pages = [
    { name: 'Patients', href: '/admin/patients' },
    { name: 'Appointments', href: '/admin/appointments' },
    { name: 'Articles', href: '/admin/articles' },
    { name: 'Settings', href: '/admin/settings' },
    { name: 'Dashboard', href: '/admin' },
  ];

  for (const p of pages) {
    console.log(`\n=== Clicking link to ${p.name} (${p.href}) ===`);
    errors.length = 0;
    
    // Click the sidebar link
    const clicked = await page.evaluate((href) => {
      const links = document.querySelectorAll('a');
      for (const a of links) {
        if (a.getAttribute('href') === href) {
          a.click();
          return true;
        }
      }
      return false;
    }, p.href);
    
    if (!clicked) {
      console.log(`  Could not find link for ${p.href}, using goto`);
      await page.goto('https://bpr.rehab' + p.href, { waitUntil: 'networkidle2', timeout: 15000 });
    } else {
      await new Promise(r => setTimeout(r, 4000));
    }
    
    console.log('  URL:', page.url());
    const err = await page.evaluate(() => document.body?.innerText?.includes('Application error'));
    console.log('  Application error:', err);
    if (errors.length) {
      console.log('  Errors:');
      errors.forEach(e => console.log('    -', e.text.substring(0, 200)));
    } else {
      console.log('  No errors');
    }
  }

  console.log('\n========== DONE ==========');
  await browser.close();
  process.exit(0);
})();
