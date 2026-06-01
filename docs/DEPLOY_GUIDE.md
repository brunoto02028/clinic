# 🚀 Guia de Deploy - BPR Clinic

**Deploy em Produção - Passo a Passo Completo**

---

## 📋 Pré-requisitos

### **Servidor**
- VPS com Ubuntu 20.04+ ou Railway
- Node.js 18+
- PostgreSQL 16+
- Nginx (se VPS)
- PM2 (se VPS)

### **Domínio**
- Domínio configurado (bpr.rehab)
- SSL/TLS (Let's Encrypt)

### **Serviços Externos**
- Stripe Account
- Google Cloud (Gemini API)
- Groq API Key
- Minimax API Key
- SMTP Server (e-mail)

---

## 🔧 Configuração de Variáveis de Ambiente

### **Criar arquivo `.env.production`**

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/bpr_clinic"

# NextAuth
NEXTAUTH_URL="https://bpr.rehab"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# AI APIs
GEMINI_API_KEY="your-gemini-api-key"
GROQ_API_KEY="your-groq-api-key"
MINIMAX_API_KEY="your-minimax-api-key"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# Storage
UPLOADS_DIR="/var/www/bpr-clinic/public/uploads"

# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://bpr.rehab"
```

### **Gerar NEXTAUTH_SECRET**

```bash
openssl rand -base64 32
```

---

## 📦 Deploy no Railway (Recomendado)

### **Passo 1: Preparar Repositório**

```bash
# Commit todas as mudanças
git add .
git commit -m "feat: Ready for production deploy"
git push origin main
```

### **Passo 2: Criar Projeto no Railway**

1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha o repositório `clinic`

### **Passo 3: Adicionar PostgreSQL**

1. Clique em "New"
2. Selecione "Database"
3. Escolha "PostgreSQL"
4. Railway cria automaticamente

### **Passo 4: Configurar Variáveis**

1. Clique no serviço
2. Vá em "Variables"
3. Adicione todas as variáveis do `.env.production`
4. Railway injeta `DATABASE_URL` automaticamente

### **Passo 5: Deploy**

```bash
# Railway faz deploy automático
# Aguarde build completar (~5-10 min)
```

### **Passo 6: Executar Migrations**

```bash
# No Railway CLI ou dashboard
npx prisma migrate deploy
npx prisma db seed
```

### **Passo 7: Configurar Domínio**

1. Settings → Domains
2. Adicione `bpr.rehab`
3. Configure DNS:
   ```
   CNAME: bpr.rehab → your-app.railway.app
   ```

---

## 🖥️ Deploy em VPS (Alternativo)

### **Passo 1: Conectar ao Servidor**

```bash
ssh user@your-server-ip
```

### **Passo 2: Instalar Dependências**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2
sudo npm install -g pm2
```

### **Passo 3: Configurar PostgreSQL**

```bash
# Criar usuário e database
sudo -u postgres psql

CREATE USER bpr_user WITH PASSWORD 'strong_password';
CREATE DATABASE bpr_clinic OWNER bpr_user;
GRANT ALL PRIVILEGES ON DATABASE bpr_clinic TO bpr_user;
\q
```

### **Passo 4: Clonar Repositório**

```bash
cd /var/www
sudo git clone https://github.com/brunoto02028/clinic.git bpr-clinic
cd bpr-clinic
sudo chown -R $USER:$USER .
```

### **Passo 5: Instalar Dependências**

```bash
npm install
```

### **Passo 6: Configurar Variáveis**

```bash
cp .env.example .env.production
nano .env.production
# Preencher todas as variáveis
```

### **Passo 7: Build**

```bash
npm run build
```

### **Passo 8: Executar Migrations**

```bash
npx prisma migrate deploy
npx prisma db seed
```

### **Passo 9: Configurar PM2**

```bash
# Criar ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'bpr-clinic',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **Passo 10: Configurar Nginx**

```bash
sudo nano /etc/nginx/sites-available/bpr-clinic
```

```nginx
server {
    listen 80;
    server_name bpr.rehab www.bpr.rehab;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/bpr-clinic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **Passo 11: Configurar SSL (Let's Encrypt)**

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d bpr.rehab -d www.bpr.rehab

# Renovação automática
sudo certbot renew --dry-run
```

---

## ✅ Checklist Pós-Deploy

### **Verificações Essenciais**

- [ ] Site acessível via HTTPS
- [ ] Login funcionando
- [ ] Database conectado
- [ ] Uploads funcionando
- [ ] E-mails sendo enviados
- [ ] Stripe funcionando
- [ ] AI APIs respondendo
- [ ] Notificações funcionando
- [ ] Geração de STL funcionando

### **Testes**

```bash
# Testar endpoints
curl https://bpr.rehab/api/health

# Testar database
curl https://bpr.rehab/api/db-check

# Testar uploads
# Upload manual via interface
```

---

## 📊 Monitoramento

### **PM2 Monitoring**

```bash
# Ver logs
pm2 logs bpr-clinic

# Ver status
pm2 status

# Monitorar recursos
pm2 monit
```

### **Logs do Nginx**

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### **Logs da Aplicação**

```bash
# Logs do Next.js
tail -f /var/www/bpr-clinic/.next/trace
```

---

## 🔄 Atualizações

### **Deploy de Nova Versão**

```bash
# Conectar ao servidor
ssh user@your-server-ip

# Ir para diretório
cd /var/www/bpr-clinic

# Pull mudanças
git pull origin main

# Instalar dependências
npm install

# Executar migrations
npx prisma migrate deploy

# Build
npm run build

# Restart
pm2 restart bpr-clinic
```

### **Rollback**

```bash
# Ver commits
git log --oneline

# Voltar para versão anterior
git checkout <commit-hash>

# Build e restart
npm run build
pm2 restart bpr-clinic
```

---

## 🔐 Segurança

### **Firewall**

```bash
# Configurar UFW
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### **Fail2Ban**

```bash
# Instalar
sudo apt install -y fail2ban

# Configurar
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### **Backups Automáticos**

```bash
# Criar script de backup
cat > /usr/local/bin/backup-bpr.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/bpr-clinic"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U bpr_user bpr_clinic | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/bpr-clinic/public/uploads

# Manter apenas últimos 7 dias
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-bpr.sh

# Agendar no cron (diário às 2am)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-bpr.sh") | crontab -
```

---

## 🆘 Troubleshooting

### **Aplicação não inicia**

```bash
# Verificar logs
pm2 logs bpr-clinic --lines 100

# Verificar variáveis
pm2 env 0

# Restart
pm2 restart bpr-clinic
```

### **Database connection error**

```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Testar conexão
psql -U bpr_user -d bpr_clinic -h localhost
```

### **Uploads não funcionam**

```bash
# Verificar permissões
ls -la /var/www/bpr-clinic/public/uploads

# Corrigir permissões
sudo chown -R www-data:www-data /var/www/bpr-clinic/public/uploads
sudo chmod -R 755 /var/www/bpr-clinic/public/uploads
```

### **SSL não funciona**

```bash
# Renovar certificado
sudo certbot renew

# Verificar Nginx
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📞 Suporte

**Problemas de Deploy:**
- E-mail: tech@bpr.rehab
- GitHub Issues: https://github.com/brunoto02028/clinic/issues

---

**Deploy com sucesso! 🎉**
