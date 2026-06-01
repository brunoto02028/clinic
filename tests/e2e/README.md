# 🧪 Testes E2E com Puppeteer

Testes end-to-end completos para validar todo o fluxo do sistema.

---

## 📋 TESTES DISPONÍVEIS

### **1. Fluxo da Clínica** (`clinic-flow.test.js`)
Testa o workflow completo do terapeuta/admin:
- ✅ Login como terapeuta
- ✅ Navegação para Foot Scans
- ✅ Visualização de detalhes do scan
- ✅ Botão de gerar palmilhas
- ✅ Menu de navegação
- ✅ Responsividade
- ✅ Performance
- ✅ Logout

### **2. Fluxo do Paciente** (`patient-flow.test.js`)
Testa o workflow completo do paciente:
- ✅ Login como paciente
- ✅ Dashboard do paciente
- ✅ Lista de scans
- ✅ Visualizador 3D
- ✅ Controles do visualizador
- ✅ Timeline de produção
- ✅ Instruções de uso
- ✅ Notificações
- ✅ Interface simples
- ✅ Responsividade mobile

---

## 🚀 COMO EXECUTAR

### **Pré-requisitos**
```bash
# Instalar dependências
npm install
```

### **Executar Todos os Testes**
```bash
npm run test:puppeteer
```

### **Executar Teste da Clínica**
```bash
npm run test:clinic
```

### **Executar Teste do Paciente**
```bash
npm run test:patient
```

---

## ⚙️ CONFIGURAÇÃO

### **URL de Teste**

Por padrão, os testes rodam em `http://localhost:3000`.

Para testar em produção:
```bash
TEST_URL=https://bpr.rehab npm run test:puppeteer
```

### **Credenciais de Teste**

#### **Terapeuta:**
- Email: `therapist@bpr.rehab`
- Senha: `test123`

#### **Paciente:**
- Email: `patient@example.com`
- Senha: `test123`

---

## 📸 SCREENSHOTS

Os testes geram screenshots automaticamente:
- `patient-mobile.png` - Versão mobile do paciente

---

## 🎯 O QUE É TESTADO

### **Funcionalidades da Clínica:**
- [x] Autenticação
- [x] Navegação
- [x] Listagem de scans
- [x] Detalhes do scan
- [x] Geração de palmilhas
- [x] Responsividade
- [x] Performance (<5s)

### **Funcionalidades do Paciente:**
- [x] Autenticação
- [x] Dashboard simples
- [x] Visualizador 3D
- [x] Controles interativos
- [x] Timeline de produção
- [x] Instruções de uso
- [x] Notificações
- [x] Interface intuitiva
- [x] Mobile responsivo

---

## 🐛 TROUBLESHOOTING

### **Erro: "Cannot find module 'puppeteer'"**
```bash
npm install -D puppeteer
```

### **Erro: "Timeout waiting for selector"**
- Verifique se o servidor está rodando
- Aumente o timeout nos testes
- Verifique as credenciais

### **Erro: "Navigation timeout"**
- Verifique a conexão com internet
- Verifique se a URL está correta
- Aumente o timeout de navegação

### **Testes falhando localmente**
```bash
# Iniciar servidor local
npm run dev

# Em outro terminal
npm run test:puppeteer
```

---

## 📊 RESULTADOS ESPERADOS

### **Sucesso:**
```
✅ Login realizado com sucesso!
✅ Página de Foot Scans carregada!
✅ Detalhes do scan carregados!
✅ Visualizador 3D carregado!
✅ Timeline de produção carregada!
✅ Instruções de uso carregadas!
```

### **Avisos (OK):**
```
⚠️ Nenhum scan encontrado para testar
⚠️ Botão não encontrado (pode já ter sido gerado)
```

### **Erros (Investigar):**
```
❌ Login falhou
❌ Timeout waiting for selector
❌ Navigation failed
```

---

## 🎨 MODO VISUAL

Os testes rodam com `headless: false` por padrão, mostrando o navegador.

Para rodar sem interface:
```javascript
// Em clinic-flow.test.js ou patient-flow.test.js
browser = await puppeteer.launch({
  headless: true, // Mudar para true
  // ...
});
```

---

## ⚡ PERFORMANCE

### **Métricas Monitoradas:**
- Tempo de login: <5s
- Tempo de carregamento de página: <5s
- Tempo de renderização 3D: <10s

### **Otimizações:**
- `slowMo: 50` - Desacelera para visualização
- `waitUntil: 'networkidle0'` - Aguarda rede estável
- Screenshots automáticos em mobile

---

## 📝 ADICIONAR NOVOS TESTES

### **Exemplo:**
```javascript
test('11. Meu Novo Teste', async () => {
  console.log('🧪 Testando nova funcionalidade...');
  
  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.type('input[name="email"]', PATIENT_EMAIL);
  await page.type('input[name="password"]', PATIENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // Seu teste aqui
  const element = await page.$('selector');
  expect(element).toBeTruthy();
  
  console.log('✅ Teste passou!');
}, 30000);
```

---

## 🔄 CI/CD

Para rodar em CI/CD (GitHub Actions, etc):

```yaml
- name: Run E2E Tests
  run: |
    npm run build
    npm run start &
    sleep 10
    npm run test:puppeteer
  env:
    TEST_URL: http://localhost:3000
```

---

## 📞 SUPORTE

**Problemas com testes?**
- Verifique os logs no console
- Tire screenshots com `page.screenshot()`
- Use `page.waitForTimeout()` para debug
- Verifique se o servidor está rodando

---

**Testes criados para garantir qualidade 100%!** ✅
