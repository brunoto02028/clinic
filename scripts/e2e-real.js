const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runE2E() {
    console.log('Iniciando Teste E2E Real (Login e Dashboard)...');

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Criar diretório de screenshots se não existir
    const screenshotDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }

    try {
        // 1. Navegar para o Login
        console.log('Navegando para http://localhost:3000/login...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

        // 2. Preencher formulário
        console.log('Preenchendo credenciais...');
        await page.type('#email', 'admin@brunophysicalrehabilitation.co.uk');
        await page.type('#password', 'Bruno@Admin2026!');

        // 3. Clicar em Sign In
        console.log('Clicando em Sign In...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        console.log('Login realizado com sucesso. URL atual:', page.url());
        await page.screenshot({ path: path.join(screenshotDir, 'dashboard-real.png'), fullPage: true });
        console.log('Screenshot do Dashboard Real salva.');

        // 4. Testar interatividade (Ex: clicar em algum aba se houver)
        // Como o dashboard tem motion.div e carregamento de stats, vamos esperar um pouco
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(screenshotDir, 'dashboard-populated.png'), fullPage: true });

    } catch (error) {
        console.error('Erro durante o E2E:', error);
        await page.screenshot({ path: path.join(screenshotDir, 'error-e2e.png') });
    } finally {
        await browser.close();
        console.log('Navegador fechado.');
    }
}

runE2E();
