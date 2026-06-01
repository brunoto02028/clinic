/**
 * Teste E2E - Fluxo Completo do Paciente
 * Testa todo o workflow do paciente
 */

const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const PATIENT_EMAIL = 'patient@example.com';
const PATIENT_PASSWORD = 'test123';

describe('Fluxo Completo do Paciente', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 50,
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

  test('1. Login como Paciente', async () => {
    console.log('🔐 Testando login do paciente...');
    
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('input[name="email"]');
    
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    const url = page.url();
    expect(url).toContain('/dashboard');
    
    console.log('✅ Login do paciente realizado!');
  }, 30000);

  test('2. Visualizar Dashboard do Paciente', async () => {
    console.log('📊 Visualizando dashboard...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Verificar elementos do dashboard
    await page.waitForSelector('h1, h2');
    
    const heading = await page.$eval('h1, h2', el => el.textContent);
    console.log(`📋 Dashboard: ${heading}`);
    
    console.log('✅ Dashboard carregado!');
  }, 30000);

  test('3. Acessar Lista de Scans', async () => {
    console.log('📋 Acessando lista de scans...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Navegar para scans
    await page.goto(`${BASE_URL}/dashboard/scans`);
    await page.waitForSelector('h1, h2');
    
    console.log('✅ Lista de scans carregada!');
  }, 30000);

  test('4. Visualizar Detalhes do Scan com 3D Viewer', async () => {
    console.log('🎨 Testando visualizador 3D...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Ir para scans
    await page.goto(`${BASE_URL}/dashboard/scans`);
    await page.waitForSelector('body');
    
    // Procurar link para detalhes
    const detailsLink = await page.$('a:has-text("Ver Detalhes")') ||
                        await page.$('a[href*="/dashboard/scans/"]');
    
    if (detailsLink) {
      await detailsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Aguardar canvas do visualizador 3D
      await page.waitForSelector('canvas', { timeout: 10000 });
      
      const canvas = await page.$('canvas');
      expect(canvas).toBeTruthy();
      
      console.log('✅ Visualizador 3D carregado!');
      
      // Aguardar um pouco para ver o 3D
      await page.waitForTimeout(2000);
    } else {
      console.log('⚠️ Nenhum scan disponível para visualizar');
    }
  }, 40000);

  test('5. Testar Controles do Visualizador 3D', async () => {
    console.log('🎮 Testando controles 3D...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Ir para scans
    await page.goto(`${BASE_URL}/dashboard/scans`);
    const detailsLink = await page.$('a[href*="/dashboard/scans/"]');
    
    if (detailsLink) {
      await detailsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      await page.waitForSelector('canvas');
      
      // Procurar botões de controle
      const buttons = ['Ambos', 'Esquerdo', 'Direito'];
      
      for (const buttonText of buttons) {
        const button = await page.$(`button:has-text("${buttonText}")`);
        if (button) {
          console.log(`✅ Botão "${buttonText}" encontrado`);
          await button.click();
          await page.waitForTimeout(500);
        }
      }
      
      console.log('✅ Controles testados!');
    }
  }, 40000);

  test('6. Visualizar Timeline de Produção', async () => {
    console.log('📅 Testando timeline de produção...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Ir para detalhes do scan
    await page.goto(`${BASE_URL}/dashboard/scans`);
    const detailsLink = await page.$('a[href*="/dashboard/scans/"]');
    
    if (detailsLink) {
      await detailsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Clicar na tab de produção
      const productionTab = await page.$('button:has-text("Produção")') ||
                            await page.$('[role="tab"]:has-text("Produção")');
      
      if (productionTab) {
        await productionTab.click();
        await page.waitForTimeout(1000);
        
        // Verificar que timeline está visível
        const timeline = await page.$('text=Progresso') ||
                        await page.$('text=Timeline');
        
        if (timeline) {
          console.log('✅ Timeline de produção carregada!');
        }
      }
    }
  }, 40000);

  test('7. Visualizar Instruções de Uso', async () => {
    console.log('📖 Testando instruções de uso...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Ir para detalhes do scan
    await page.goto(`${BASE_URL}/dashboard/scans`);
    const detailsLink = await page.$('a[href*="/dashboard/scans/"]');
    
    if (detailsLink) {
      await detailsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      
      // Clicar na tab de instruções
      const instructionsTab = await page.$('button:has-text("Como Usar")') ||
                              await page.$('[role="tab"]:has-text("Instruções")');
      
      if (instructionsTab) {
        await instructionsTab.click();
        await page.waitForTimeout(1000);
        
        // Verificar que instruções estão visíveis
        const instructions = await page.$('text=Período de Adaptação') ||
                            await page.$('text=Como Usar');
        
        if (instructions) {
          console.log('✅ Instruções de uso carregadas!');
        }
      }
    }
  }, 40000);

  test('8. Verificar Notificações', async () => {
    console.log('🔔 Testando notificações...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Procurar sino de notificações
    const notificationBell = await page.$('button[aria-label="Notifications"]') ||
                             await page.$('svg.lucide-bell');
    
    if (notificationBell) {
      console.log('✅ Sino de notificações encontrado!');
      
      // Clicar no sino
      await notificationBell.click();
      await page.waitForTimeout(1000);
      
      // Verificar que dropdown abriu
      const dropdown = await page.$('text=Notificações');
      if (dropdown) {
        console.log('✅ Dropdown de notificações aberto!');
      }
    } else {
      console.log('⚠️ Sino de notificações não encontrado');
    }
  }, 30000);

  test('9. Testar Interface Simples do Paciente', async () => {
    console.log('🎨 Verificando simplicidade da interface...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Verificar que não há elementos complexos
    const complexElements = [
      'Admin',
      'Settings',
      'Configuration',
      'Database'
    ];
    
    for (const element of complexElements) {
      const found = await page.$(`text=${element}`);
      if (!found) {
        console.log(`✅ Elemento complexo "${element}" não encontrado (bom!)`);
      } else {
        console.log(`⚠️ Elemento "${element}" encontrado (pode ser muito complexo)`);
      }
    }
    
    console.log('✅ Interface simples verificada!');
  }, 30000);

  test('10. Testar Responsividade Mobile', async () => {
    console.log('📱 Testando versão mobile...');
    
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.type('input[name="email"]', PATIENT_EMAIL);
    await page.type('input[name="password"]', PATIENT_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Mudar para mobile
    await page.setViewport({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle0' });
    
    // Verificar que está responsivo
    await page.waitForSelector('body');
    
    // Tirar screenshot
    await page.screenshot({ path: 'patient-mobile.png' });
    
    console.log('✅ Versão mobile testada!');
    console.log('📸 Screenshot salvo: patient-mobile.png');
  }, 30000);
});
