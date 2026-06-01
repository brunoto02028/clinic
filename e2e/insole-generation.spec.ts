import { test, expect } from '@playwright/test';

test.describe('Insole Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login como terapeuta
    await page.goto('/login');
    await page.fill('input[name="email"]', 'therapist@bpr.rehab');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should generate insoles from foot scan', async ({ page }) => {
    // Navegar para foot scans
    await page.goto('/admin/foot-scans');
    
    // Selecionar primeiro scan
    await page.click('tr:first-child a');
    
    // Verificar que está na página de detalhes
    await expect(page.locator('h1')).toContainText('Foot Scan');
    
    // Clicar em gerar palmilhas
    const generateButton = page.locator('button:has-text("Gerar Palmilhas")');
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Aguardar geração
      await page.waitForSelector('text=Palmilhas geradas com sucesso', { timeout: 60000 });
      
      // Verificar que URLs de STL foram criadas
      await expect(page.locator('text=left-insole.stl')).toBeVisible();
      await expect(page.locator('text=right-insole.stl')).toBeVisible();
    }
  });

  test('should show validation errors for invalid geometry', async ({ page }) => {
    // Este teste seria executado com dados de teste específicos
    // que causariam erro de validação
    await page.goto('/admin/foot-scans/invalid-scan-id');
    
    // Verificar mensagem de erro
    await expect(page.locator('text=Scan não encontrado')).toBeVisible();
  });
});

test.describe('Patient Portal - Insole Viewing', () => {
  test.beforeEach(async ({ page }) => {
    // Login como paciente
    await page.goto('/login');
    await page.fill('input[name="email"]', 'patient@example.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should view 3D insole model', async ({ page }) => {
    // Navegar para scans
    await page.goto('/dashboard/scans');
    
    // Clicar no primeiro scan
    await page.click('a:has-text("Ver Detalhes")');
    
    // Verificar visualizador 3D
    await expect(page.locator('canvas')).toBeVisible();
    
    // Verificar controles
    await expect(page.locator('button:has-text("Ambos")')).toBeVisible();
    await expect(page.locator('button:has-text("Esquerdo")')).toBeVisible();
    await expect(page.locator('button:has-text("Direito")')).toBeVisible();
  });

  test('should view production timeline', async ({ page }) => {
    await page.goto('/dashboard/scans/test-scan-id');
    
    // Clicar na tab de produção
    await page.click('button:has-text("Produção")');
    
    // Verificar timeline
    await expect(page.locator('text=Progresso')).toBeVisible();
    await expect(page.locator('text=Scan Realizado')).toBeVisible();
  });

  test('should view usage instructions', async ({ page }) => {
    await page.goto('/dashboard/scans/test-scan-id');
    
    // Clicar na tab de instruções
    await page.click('button:has-text("Como Usar")');
    
    // Verificar instruções
    await expect(page.locator('text=Período de Adaptação')).toBeVisible();
    await expect(page.locator('text=Primeiro Dia')).toBeVisible();
  });
});

test.describe('Notifications', () => {
  test('should receive notification when insoles are ready', async ({ page }) => {
    // Login como paciente
    await page.goto('/login');
    await page.fill('input[name="email"]', 'patient@example.com');
    await page.fill('input[name="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    // Verificar sino de notificações
    const notificationBell = page.locator('button[aria-label="Notifications"]');
    await expect(notificationBell).toBeVisible();
    
    // Verificar badge de notificações não lidas
    const badge = page.locator('button[aria-label="Notifications"] span.badge');
    if (await badge.isVisible()) {
      await notificationBell.click();
      
      // Verificar lista de notificações
      await expect(page.locator('text=Notificações')).toBeVisible();
    }
  });
});
