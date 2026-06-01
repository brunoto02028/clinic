# 🚂 Railway Troubleshooting - Guia Rápido

**Problema:** Build falhando no Railway

---

## ✅ SOLUÇÃO PASSO A PASSO

### **1. Verificar Variáveis de Ambiente (CRÍTICO)**

No Railway, vá em **Variables** e adicione:

#### **Mínimo Obrigatório:**
```bash
NEXTAUTH_URL=https://seu-app.railway.app
NEXTAUTH_SECRET=cole-aqui-o-secret-gerado
NODE_ENV=production
```

#### **Gerar NEXTAUTH_SECRET:**
```bash
# No seu terminal local:
openssl rand -base64 32
```

Copie o resultado e cole em `NEXTAUTH_SECRET`

---

### **2. Adicionar PostgreSQL**

1. No Railway, clique em **"New"**
2. Selecione **"Database"**
3. Escolha **"PostgreSQL"**
4. Railway cria `DATABASE_URL` automaticamente ✅

---

### **3. Configurar Build Command**

No Railway, vá em **Settings → Build**:

```bash
npm install && npx prisma generate && npm run build
```

---

### **4. Configurar Start Command**

No Railway, vá em **Settings → Deploy**:

```bash
npm run start
```

---

### **5. Adicionar Variáveis Opcionais (Mas Recomendadas)**

```bash
# AI APIs (para análise de foot scans)
GEMINI_API_KEY=sua-chave-gemini
GROQ_API_KEY=sua-chave-groq
MINIMAX_API_KEY=sua-chave-minimax

# Stripe (para pagamentos)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
```

---

## 🔧 ERROS COMUNS E SOLUÇÕES

### **Erro: "NEXTAUTH_SECRET is not defined"**

**Solução:**
```bash
# Gerar secret:
openssl rand -base64 32

# Adicionar em Variables:
NEXTAUTH_SECRET=resultado-aqui
```

---

### **Erro: "DATABASE_URL is not defined"**

**Solução:**
1. Adicione PostgreSQL database
2. Railway cria a variável automaticamente
3. Se não aparecer, reconecte o database

---

### **Erro: "Prisma Client not generated"**

**Solução:**
Adicionar no Build Command:
```bash
npm install && npx prisma generate && npm run build
```

---

### **Erro: "Build timeout"**

**Solução:**
1. Vá em Settings → Build
2. Aumente o timeout para 30 minutos
3. Ou use Railway Pro (builds mais rápidos)

---

### **Erro: "Module not found"**

**Solução:**
```bash
# Limpar cache e rebuild
# No Railway: Settings → Redeploy
```

---

## 📋 CHECKLIST COMPLETO

### **Antes de Deploy:**
- [ ] PostgreSQL database adicionado
- [ ] `NEXTAUTH_SECRET` gerado e adicionado
- [ ] `NEXTAUTH_URL` configurado
- [ ] `NODE_ENV=production` configurado
- [ ] Build command configurado
- [ ] Start command configurado

### **Variáveis Opcionais:**
- [ ] AI API keys (Gemini, Groq, Minimax)
- [ ] Stripe keys
- [ ] SMTP configurado
- [ ] `NEXT_PUBLIC_APP_URL` configurado

### **Após Deploy:**
- [ ] Executar migrations: `npx prisma migrate deploy`
- [ ] Seed database (opcional): `npx prisma db seed`
- [ ] Testar login
- [ ] Testar upload de scans

---

## 🚀 DEPLOY RÁPIDO (MÍNIMO)

Se quiser fazer deploy rápido apenas para testar:

### **1. Variáveis Mínimas:**
```bash
NEXTAUTH_URL=https://seu-app.railway.app
NEXTAUTH_SECRET=cole-secret-aqui
NODE_ENV=production
```

### **2. Adicionar PostgreSQL**
- New → Database → PostgreSQL

### **3. Deploy**
- Railway faz automaticamente

### **4. Executar Migrations**
No Railway CLI ou terminal:
```bash
npx prisma migrate deploy
```

---

## 🔍 VER LOGS

Para ver o que está causando o erro:

1. No Railway, clique no deploy falhado
2. Vá em **"Build Logs"**
3. Procure por linhas com ❌ ou ERROR
4. Leia a mensagem de erro específica

---

## 💡 DICAS

### **Desenvolvimento Local vs Produção**

```bash
# Local (.env.local)
DATABASE_URL="postgresql://localhost:5432/clinic_dev"
NEXTAUTH_URL="http://localhost:3000"

# Produção (Railway Variables)
DATABASE_URL="postgresql://..." # Railway fornece
NEXTAUTH_URL="https://seu-app.railway.app"
```

### **Testar Build Localmente**

```bash
# Simular build do Railway:
npm install
npx prisma generate
npm run build
npm run start
```

Se funcionar localmente mas falhar no Railway, é problema de variáveis de ambiente.

---

## 📞 AINDA COM PROBLEMAS?

### **1. Ver Logs Detalhados**
```bash
# No Railway dashboard:
Deploy → Build Logs
Deploy → Deploy Logs
```

### **2. Verificar Status**
```bash
# Health check:
curl https://seu-app.railway.app/api/health
```

### **3. Redeploy**
```bash
# No Railway:
Settings → Redeploy
```

### **4. Limpar Cache**
```bash
# No Railway:
Settings → Clear Build Cache → Redeploy
```

---

## ✅ CONFIGURAÇÃO COMPLETA RECOMENDADA

```bash
# === OBRIGATÓRIO ===
DATABASE_URL=postgresql://...  # Railway fornece
NEXTAUTH_URL=https://seu-app.railway.app
NEXTAUTH_SECRET=seu-secret-aqui
NODE_ENV=production

# === RECOMENDADO ===
NEXT_PUBLIC_APP_URL=https://seu-app.railway.app

# === FUNCIONALIDADES COMPLETAS ===
# AI APIs
GEMINI_API_KEY=sua-chave
GROQ_API_KEY=sua-chave
MINIMAX_API_KEY=sua-chave

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app

# Opcional
INTERSERVER_PORT=21
DNCLNC_API_URL=http://0.182.18.48:8000
FACEBOOK_APP_ID=848308944444568
```

---

## 🎯 PRÓXIMOS PASSOS APÓS DEPLOY

1. **Executar Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Criar Usuário Admin:**
   ```bash
   npx prisma db seed
   ```

3. **Testar Sistema:**
   - Login: https://seu-app.railway.app/login
   - Dashboard: https://seu-app.railway.app/admin/dashboard

4. **Configurar Domínio Customizado:**
   - Settings → Domains
   - Adicionar seu domínio (bpr.rehab)

---

**Problema resolvido? Deploy com sucesso!** 🚀

**Ainda com erro? Mande screenshot dos logs!** 📸
