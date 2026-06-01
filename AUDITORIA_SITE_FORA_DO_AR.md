# Auditoria - Site Fora do Ar (bpr.rehab)

**Data:** 01/06/2026 06:56  
**Status:** 🔴 Site inacessível  
**URL:** https://bpr.rehab/

---

## 🔍 ANÁLISE INICIAL

### ✅ Build Local
- **Status:** Funcionando perfeitamente
- **Comando:** `npm run build`
- **Resultado:** Compilação bem-sucedida
- **Conclusão:** O código está correto

### ⚠️ Mudanças Recentes (Pull do GitHub)
- **14 arquivos modificados**
- **Arquivos novos:**
  - `Dockerfile` (modificado)
  - `start.sh` (novo)
- **Mudanças críticas:**
  - Sistema de deploy alterado
  - Porta configurada: `4002`
  - Novo script de inicialização

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Porta Incorreta no Dockerfile**

**Problema:**
```dockerfile
ENV PORT=4002
EXPOSE 4002
```

**Railway espera:**
- Porta dinâmica via variável `$PORT`
- Geralmente: `3000` ou `8080`

**Impacto:** Railway não consegue se conectar ao serviço

---

### 2. **Script start.sh com Dependências**

**Problema:**
```sh
exec su-exec nextjs node server.js
```

**Requisitos:**
- Pacote `su-exec` precisa estar instalado
- Arquivo `server.js` precisa existir (standalone build)
- Permissões corretas para usuário `nextjs`

**Impacto:** Se qualquer requisito falhar, o container não inicia

---

### 3. **Configuração UPLOADS_DIR**

**Problema:**
```sh
mkdir -p "${UPLOADS_DIR:-/app/data/uploads}"
chown -R nextjs:nodejs "${UPLOADS_DIR:-/app/data/uploads}"
```

**Requisitos:**
- Variável `UPLOADS_DIR` deve estar configurada no Railway
- Volume deve estar montado em `/app/data`
- Permissões devem ser corretas

**Impacto:** Se volume não existir ou permissões falharem, pode travar

---

## 🔧 SOLUÇÕES PROPOSTAS

### Solução 1: **Corrigir Porta no Dockerfile** (RECOMENDADO)

```dockerfile
# ANTES (ERRADO)
ENV PORT=4002
EXPOSE 4002

# DEPOIS (CORRETO)
ENV PORT=${PORT:-3000}
EXPOSE ${PORT:-3000}
```

**Por quê:** Railway injeta a porta via variável de ambiente

---

### Solução 2: **Simplificar start.sh**

```sh
#!/bin/sh
set -e

# Create upload directories if UPLOADS_DIR is set
if [ -n "$UPLOADS_DIR" ]; then
  mkdir -p "$UPLOADS_DIR" || true
  chmod -R 755 "$UPLOADS_DIR" || true
  echo "[start.sh] Upload directory ready: $UPLOADS_DIR"
fi

# Start the app (Railway handles user permissions)
exec node server.js
```

**Por quê:** Remove dependência de `su-exec` e simplifica permissões

---

### Solução 3: **Verificar next.config.js**

Garantir que standalone build está ativado:

```javascript
module.exports = {
  output: 'standalone',
  // ... resto da config
}
```

---

## 📋 CHECKLIST DE CORREÇÃO

### Imediato (Código)
- [ ] Corrigir porta no Dockerfile para usar `$PORT`
- [ ] Simplificar start.sh (remover su-exec)
- [ ] Verificar next.config.js (output: standalone)
- [ ] Commit e push das correções

### Railway (Configuração)
- [ ] Verificar se variável `PORT` está configurada
- [ ] Verificar se `UPLOADS_DIR=/app/data/uploads` está configurada
- [ ] Verificar se volume está montado em `/app/data`
- [ ] Verificar logs do deploy para erros específicos

### Teste
- [ ] Deploy automático após push
- [ ] Verificar logs do Railway
- [ ] Testar acesso a https://bpr.rehab/
- [ ] Verificar health check

---

## 🔍 COMO VERIFICAR LOGS NO RAILWAY

1. Acesse: https://railway.app/
2. Entre no projeto "clinic"
3. Vá para **Deployments**
4. Clique no deploy mais recente
5. Vá para **Logs**
6. Procure por:
   - `Error:` (erros)
   - `ECONNREFUSED` (porta incorreta)
   - `Permission denied` (problemas de permissão)
   - `Cannot find module` (dependências faltando)

---

## 🎯 CAUSA RAIZ MAIS PROVÁVEL

**Porta hardcoded no Dockerfile (`4002`) não corresponde à porta que o Railway espera.**

Railway injeta a porta via variável de ambiente `$PORT`, mas o Dockerfile está forçando `4002`.

**Resultado:** Railway não consegue se conectar ao serviço → Site fica fora do ar.

---

## 🚀 AÇÃO IMEDIATA

1. **Corrigir Dockerfile:**
   - Mudar `ENV PORT=4002` para `ENV PORT=${PORT:-3000}`
   - Mudar `EXPOSE 4002` para `EXPOSE ${PORT:-3000}`

2. **Simplificar start.sh:**
   - Remover `su-exec`
   - Usar `exec node server.js` diretamente

3. **Commit e Push:**
   ```bash
   git add Dockerfile start.sh
   git commit -m "Fix: Corrigir porta e start.sh para Railway"
   git push
   ```

4. **Aguardar Deploy:**
   - Railway fará deploy automático
   - Verificar logs
   - Testar site

---

## ⏱️ TEMPO ESTIMADO DE CORREÇÃO

- **Correção do código:** 5 minutos
- **Deploy no Railway:** 2-3 minutos
- **Verificação:** 2 minutos
- **Total:** ~10 minutos

---

## 📊 PRIORIDADE

🔴 **CRÍTICA** - Site completamente fora do ar

---

## ✅ VALIDAÇÃO PÓS-CORREÇÃO

Após correção e deploy:

1. [ ] Site acessível em https://bpr.rehab/
2. [ ] Login funciona
3. [ ] Upload de imagens funciona
4. [ ] Imagens persistem no volume
5. [ ] Logs do Railway sem erros

---

**Próximo passo:** Aplicar Solução 1 e Solução 2, fazer commit e push.
