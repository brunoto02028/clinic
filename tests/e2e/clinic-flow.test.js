/**
 * Teste E2E - Fluxo Completo da Clínica
 * Testa todo o workflow do terapeuta/admin
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const THERAPIST_EMAIL = 'therapist@bpr.rehab';
const THERAPIST_PASSWORD = 'test123';

describe('Fluxo Completo da Clínica', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // Mostrar navegador
      slowMo: 50, // Desacelerar para visualizar
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('1. Login como Terapeuta', async () => {
    console.log('🔐 Testando login...');
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[name="email"]');
    
    // Preencher formulário
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    
    // Clicar em entrar
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Verificar que está no dashboard
    const url = page.url();
    expect(url).toContain('/admin/dashboard');
    
    console.log('✅ Login realizado com sucesso!');
  }, 30000);

  test('2. Navegar para Foot Scans', async () => {
    console.log('📊 Navegando para Foot Scans...');
    
    // Login primeiro
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Navegar para foot scans
    await page.goto(`${BASE_URL}/admin/foot-scans`);
    await page.waitForSelector('h1');
    
    const title = await page.$eval('h1', el => el.textContent);
    expect(title).toContain('Foot Scans');
    
    console.log('✅ Página de Foot Scans carregada!');
  }, 30000);

  test('3. Visualizar Detalhes de um Scan', async () => {
    console.log('🔍 Visualizando detalhes do scan...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Ir para foot scans
    await page.goto(`${BASE_URL}/admin/foot-scans`);
    await page.waitForSelector('table');
    
    // Clicar no primeiro scan (se existir)
    const firstScanLink = await page.$('table tbody tr:first-child a');
    if (firstScanLink) {
      await firstScanLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Verificar que está na página de detalhes
      const url = page.url();
      expect(url).toContain('/admin/foot-scans/');
      
      console.log('✅ Detalhes do scan carregados!');
    } else {
      console.log('⚠️ Nenhum scan encontrado para testar');
    }
  }, 30000);

  test('4. Testar Botão de Gerar Palmilhas', async () => {
    console.log('👟 Testando geração de palmilhas...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Ir para foot scans
    await page.goto(`${BASE_URL}/admin/foot-scans`);
    await page.waitForSelector('table');
    
    // Clicar no primeiro scan
    const firstScanLink = await page.$('table tbody tr:first-child a');
    if (firstScanLink) {
      await firstScanLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Procurar botão de gerar palmilhas
      const generateButton = await page.$('button:has-text("Gerar Palmilhas")');
      if (generateButton) {
        console.log('✅ Botão de gerar palmilhas encontrado!');
        
        // Não clicar para não gastar recursos, apenas verificar que existe
        const isVisible = await generateButton.isVisible();
        expect(isVisible).toBe(true);
      } else {
        console.log('⚠️ Botão não encontrado (pode já ter sido gerado)');
      }
    }
  }, 30000);

  test('5. Verificar Menu de Navegação', async () => {
    console.log('🧭 Verificando menu de navegação...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Verificar itens do menu
    const menuItems = [
      'Dashboard',
      'Patients',
      'Foot Scans',
      'Appointments'
    ];
    
    for (const item of menuItems) {
      const menuItem = await page.$(`text=${item}`);
      if (menuItem) {
        console.log(`✅ Menu "${item}" encontrado`);
      }
    }
  }, 30000);

  test('6. Testar Responsividade', async () => {
    console.log('📱 Testando responsividade...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Testar em diferentes tamanhos
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.reload({ waitUntil: 'networkidle0' });
      
      // Verificar que a página carregou
      const title = await page.title();
      expect(title).toBeTruthy();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) OK`);
      
      await page.waitForTimeout(1000);
    }
  }, 60000);

  test('7. Verificar Performance', async () => {
    console.log('⚡ Testando performance...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ Tempo de carregamento: ${loadTime}ms`);
    
    // Verificar que carregou em menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);
    
    console.log('✅ Performance OK!');
  }, 30000);

  test('8. Logout', async () => {
    console.log('🚪 Testando logout...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', THERAPIST_EMAIL);
    await page.type('input[name="password"]', THERAPIST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Procurar botão de logout
    const logoutButton = await page.$('button:has-text("Logout")') || 
                         await page.$('a:has-text("Sair")');
    
    if (logoutButton) {
      await logoutButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Verificar que voltou para login
      const url = page.url();
      expect(url).toContain('/login');
      
      console.log('✅ Logout realizado com sucesso!');
    } else {
      console.log('⚠️ Botão de logout não encontrado');
    }
  }, 30000);
});
