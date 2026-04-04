# Railway Deployment Setup

## 🚨 PROBLEMA: Upload de Imagens Falhando

### Causa
O Railway usa um sistema de arquivos **efêmero** - quando o container reinicia, todos os arquivos em `/public/uploads` são perdidos.

### Solução
Usar um **Volume Persistente** do Railway.

---

## ✅ CONFIGURAÇÃO NECESSÁRIA NO RAILWAY

### 1. Criar Volume Persistente

No Railway Dashboard:

1. Vá para o seu projeto
2. Clique em **"Settings"**
3. Vá para **"Volumes"**
4. Clique em **"New Volume"**
5. Configure:
   - **Mount Path:** `/data`
   - **Size:** 1GB (ou mais se necessário)
6. Clique em **"Add"**

### 2. Adicionar Variável de Ambiente

No Railway Dashboard:

1. Vá para **"Variables"**
2. Adicione:
   ```
   RAILWAY_ENVIRONMENT=production
   ```

### 3. Redeploy

Após criar o volume e adicionar a variável:
1. Clique em **"Deploy"** → **"Redeploy"**
2. Aguarde o deploy completar

---

## 📁 ESTRUTURA DE ARQUIVOS

### Desenvolvimento (Local)
```
/public/uploads/
  └── [arquivos de imagem]
```

### Produção (Railway)
```
/data/uploads/
  └── [arquivos de imagem]
```

---

## 🔄 COMO FUNCIONA

### Upload API (`/api/upload`)
```typescript
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const uploadsDir = isRailway 
  ? '/data/uploads'           // Railway persistent volume
  : 'public/uploads';         // Local development
```

### Servir Arquivos (`/api/uploads/[...path]`)
```typescript
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production';
const uploadsDir = isRailway 
  ? '/data/uploads'           // Railway persistent volume
  : 'public/uploads';         // Local development
```

---

## 🧪 TESTAR

### Após configurar o volume:

1. Faça upload de uma imagem no admin
2. Verifique se aparece na Image Library
3. Reinicie o serviço no Railway
4. Verifique se a imagem ainda está lá

Se a imagem persistir após o restart, está funcionando! ✅

---

## 📊 MONITORAMENTO

### Ver logs do Railway:
```bash
# No Railway Dashboard
Deployments → Latest → Logs
```

### Procure por:
```
[upload] Environment: Railway
[upload] Saved file to: /data/uploads/[filename]
[upload] Public URL: /api/uploads/[filename]
```

---

## 🆘 TROUBLESHOOTING

### Problema: "Failed to upload image. Please try again."

**Causa:** Volume não configurado ou variável de ambiente faltando

**Solução:**
1. Verifique se o volume está montado em `/data`
2. Verifique se `RAILWAY_ENVIRONMENT=production` está configurado
3. Redeploy o serviço

### Problema: Imagens desaparecem após restart

**Causa:** Volume não está persistente

**Solução:**
1. Certifique-se que o volume foi criado corretamente
2. Verifique o mount path: `/data` (não `/data/uploads`)
3. Redeploy

### Problema: "File not found" ao visualizar imagem

**Causa:** URL incorreta ou arquivo não existe

**Solução:**
1. Verifique os logs: URL deve ser `/api/uploads/[filename]`
2. Verifique se o arquivo existe em `/data/uploads/`
3. Teste a URL diretamente: `https://bpr.rehab/api/uploads/[filename]`

---

## 💾 BACKUP

### Fazer backup dos uploads:

```bash
# No Railway CLI
railway run ls -la /data/uploads
railway run tar -czf uploads-backup.tar.gz /data/uploads
```

### Restaurar backup:

```bash
railway run tar -xzf uploads-backup.tar.gz -C /
```

---

## 📈 CUSTOS

- **Volume 1GB:** Grátis no plano Hobby
- **Volume 10GB:** ~$2.50/mês
- **Volume 100GB:** ~$25/mês

Recomendação: Começar com 1GB e aumentar conforme necessário.

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

- [ ] Volume criado no Railway (mount path: `/data`)
- [ ] Variável `RAILWAY_ENVIRONMENT=production` adicionada
- [ ] Redeploy realizado
- [ ] Upload de imagem testado
- [ ] Imagem persiste após restart
- [ ] URLs funcionando (`/api/uploads/[filename]`)

---

## 🔗 LINKS ÚTEIS

- [Railway Volumes Documentation](https://docs.railway.app/reference/volumes)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Railway CLI](https://docs.railway.app/develop/cli)
