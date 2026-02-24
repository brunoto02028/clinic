const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runTest() {
    console.log('Iniciando Teste com Puppeteer...');

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
        // Testar Home Page
        console.log('Navegando para http://localhost:3000...');
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: path.join(screenshotDir, 'home-page.png') });
        console.log('Screenshot da Home salva.');

        // Testar Página de Teste
        console.log('Navegando para http://localhost:3000/test...');
        await page.goto('http://localhost:3000/test', { waitUntil: 'networkidle2' });

        // Verificar se o texto esperado está lá
        const title = await page.evaluate(() => document.querySelector('h3')?.innerText);
        console.log('Título encontrado:', title);

        if (title === 'Clinic Test Page') {
            console.log('SUCESSO: Página de teste carregada corretamente.');
        } else {
            console.log('AVISO: Título da página de teste não corresponde ao esperado.');
        }

        await page.screenshot({ path: path.join(screenshotDir, 'test-page.png') });
        console.log('Screenshot da Test Page salva.');

        // Testar Página de Preview
        console.log('Navegando para http://localhost:3000/preview...');
        await page.goto('http://localhost:3000/preview', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: path.join(screenshotDir, 'preview-page.png') });
        console.log('Screenshot da Preview Page salva.');

    } catch (error) {
        console.error('Erro durante o teste:', error);
    } finally {
        await browser.close();
        console.log('Navegador fechado.');
    }
}

runTest();
