const puppeteer = require('/root/clinic/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  try {
    await page.goto('http://localhost:4002/', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch(e) { errors.push('NAV: ' + e.message); }
  await new Promise(r => setTimeout(r, 3000));
  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(e));
  if (errors.length === 0) console.log('No errors found - page loaded OK');
  await browser.close();
})();
