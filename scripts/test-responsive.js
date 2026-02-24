const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
    { name: 'mobile', width: 375, height: 812 },    // iPhone X
    { name: 'tablet', width: 768, height: 1024 },   // iPad
    { name: 'desktop', width: 1440, height: 900 },  // Standard Laptop
    { name: '4k', width: 3840, height: 2160 }       // 4K Monitor
];

const PAGES = [
    { name: 'home', url: 'http://localhost:3000' },
    { name: 'test', url: 'http://localhost:3000/test' },
    { name: 'preview', url: 'http://localhost:3000/preview' }
];

async function runAudit() {
    console.log('--- Iniciando Auditoria de Responsividade ---');

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    const auditDir = path.join(__dirname, '../audit_results');
    if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir);
    }

    try {
        for (const sitePage of PAGES) {
            console.log(`\nAuditando página: ${sitePage.name}`);

            for (const vp of VIEWPORTS) {
                console.log(`  - Capturando ${vp.name} (${vp.width}x${vp.height})...`);
                await page.setViewport({ width: vp.width, height: vp.height });
                await page.goto(sitePage.url, { waitUntil: 'networkidle2' });

                // Scroll to bottom to trigger animations
                await page.evaluate(async () => {
                    await new Promise((resolve) => {
                        let totalHeight = 0;
                        const distance = 100;
                        const timer = setInterval(() => {
                            const scrollHeight = document.body.scrollHeight;
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 100);
                    });
                });

                // Scroll back to top to take a clean screenshot if needed, 
                // but for fullPage screenshots it usually captures the state.
                // However, some animations might be based on "once: true", 
                // so they will stay visible once triggered.
                const fileName = `${sitePage.name}-${vp.name}.png`;
                await page.screenshot({
                    path: path.join(auditDir, fileName),
                    fullPage: vp.name !== '4k' // Don't do full page for 4k to avoid massive files
                });
            }
        }

        console.log('\n--- Auditoria concluída com sucesso! ---');
        console.log(`Resultados salvos em: ${auditDir}`);

    } catch (error) {
        console.error('Erro durante a auditoria:', error);
    } finally {
        await browser.close();
    }
}

runAudit();
