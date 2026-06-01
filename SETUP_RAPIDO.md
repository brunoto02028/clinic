# ⚡ SETUP RÁPIDO - BPR CLINIC

**Tempo estimado:** 30 minutos  
**Última atualização:** 01/06/2026

---

## 🎯 CHECKLIST DE CONFIGURAÇÃO

### **1. Analytics (10 min)** ⭐⭐⭐⭐⭐

#### **Google Analytics 4:**

```bash
# 1. Criar conta GA4
# Ir para: https://analytics.google.com
# Criar propriedade > Escolher "Web"
# Copiar ID (formato: G-XXXXXXXXXX)

# 2. Adicionar ao Railway
railway variables set NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# 3. Verificar
# Abrir site em produção
# Ir para GA4 > Realtime
# Deve aparecer 1 usuário ativo
```

#### **Hotjar:**

```bash
# 1. Criar conta Hotjar
# Ir para: https://www.hotjar.com
# Plano grátis: 35 sessões/dia
# Copiar Site ID

# 2. Adicionar ao Railway
railway variables set NEXT_PUBLIC_HOTJAR_ID=1234567

# 3. Verificar
# Abrir site em produção
# Ir para Hotjar > Recordings
# Navegar no site
# Deve aparecer gravação
```

**Status:** ✅ Implementado, só falta configurar IDs

---

### **2. Backup Automático (15 min)** ⭐⭐⭐⭐⭐

#### **Teste Manual:**

```bash
# 1. Testar localmente
export DATABASE_URL="sua-url-do-railway"
./scripts/backup-database.sh

# 2. Verificar backup criado
ls -lh backups/database/

# 3. Testar restore
createdb test_restore
gunzip -c backups/database/backup_*.sql.gz | psql test_restore
psql test_restore -c "SELECT COUNT(*) FROM \"User\";"
dropdb test_restore
```

#### **Automatizar com GitHub Actions:**

```bash
# 1. Adicionar secrets no GitHub
# Settings > Secrets > New repository secret

DATABASE_URL: [copiar do Railway]
AWS_ACCESS_KEY_ID: [se usar S3]
AWS_SECRET_ACCESS_KEY: [se usar S3]

# 2. Criar arquivo .github/workflows/backup.yml
# (já está no IMPLEMENTACAO_PENDENTE.md)

# 3. Testar manualmente
# Actions > Database Backup > Run workflow
```

**Status:** ✅ Script pronto, falta automatizar

---

### **3. FAQ e Help (5 min)** ⭐⭐⭐⭐

```bash
# Já está pronto!
# Acessar: https://bpr.rehab/help

# Customizar conteúdo:
# Editar: app/help/page.tsx
# Adicionar mais perguntas no array faqs
```

**Status:** ✅ Pronto e funcionando

---

## 🚀 PRÓXIMOS PASSOS CRÍTICOS

### **HOJE (30 min):**

1. **Configurar Analytics**
   ```bash
   # Google Analytics
   railway variables set NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   
   # Hotjar
   railway variables set NEXT_PUBLIC_HOTJAR_ID=1234567
   
   # Restart
   railway up
   ```

2. **Testar Backup**
   ```bash
   export DATABASE_URL="postgresql://..."
   ./scripts/backup-database.sh
   ls -lh backups/database/
   ```

3. **Verificar Help Page**
   ```bash
   # Abrir https://bpr.rehab/help
   # Testar busca
   # Verificar todas as categorias
   ```

---

### **ESTA SEMANA (10 horas):**

#### **Segunda (2h):**
- [ ] Configurar Google Analytics
- [ ] Configurar Hotjar
- [ ] Testar analytics em produção

#### **Terça (4h):**
- [ ] Beta test com 1 paciente
- [ ] Anotar TODOS os problemas
- [ ] Gravar tela do teste

#### **Quarta (2h):**
- [ ] Configurar backup automático
- [ ] Testar restore
- [ ] Documentar processo

#### **Quinta (1h):**
- [ ] Adicionar tooltips em 5 lugares
- [ ] Testar FAQ page

#### **Sexta (1h):**
- [ ] Compilar feedback da semana
- [ ] Priorizar melhorias
- [ ] Planejar próxima semana

---

## 📊 VALIDAÇÃO

### **Analytics Funcionando:**

```bash
# 1. Abrir site em produção
# 2. Abrir Google Analytics > Realtime
# 3. Navegar no site
# 4. Verificar eventos aparecendo

# Eventos para testar:
- page_view (automático)
- login
- scan_uploaded
- insole_generated
```

### **Hotjar Funcionando:**

```bash
# 1. Abrir site em produção
# 2. Navegar por 2-3 minutos
# 3. Ir para Hotjar dashboard
# 4. Verificar Recording apareceu
# 5. Assistir gravação
```

### **Backup Funcionando:**

```bash
# 1. Executar backup
./scripts/backup-database.sh

# 2. Verificar arquivo criado
ls -lh backups/database/backup_*.sql.gz

# 3. Verificar tamanho (deve ser >1MB)
du -h backups/database/backup_*.sql.gz

# 4. Testar restore
gunzip -c backups/database/backup_*.sql.gz | head -n 50
```

---

## 🎯 MÉTRICAS PARA ACOMPANHAR

### **Semana 1:**
```
□ Analytics configurado
□ Hotjar configurado
□ Backup testado
□ 1 beta tester
□ 5+ problemas identificados
```

### **Semana 2:**
```
□ 5 beta testers
□ Backup automático rodando
□ 20+ pontos de feedback
□ Tooltips adicionados
□ 1 vídeo tutorial gravado
```

### **Mês 1:**
```
□ 10+ usuários ativos
□ 50+ scans processados
□ Backup rodando diariamente
□ Google Analytics com dados
□ Hotjar com 20+ gravações
```

---

## 🔧 TROUBLESHOOTING

### **Analytics não aparece:**

```bash
# 1. Verificar variável de ambiente
railway variables

# 2. Verificar console do browser
# F12 > Console
# Procurar por "gtag" ou "hj"

# 3. Verificar NODE_ENV
# Analytics só carrega em production
```

### **Backup falha:**

```bash
# 1. Verificar DATABASE_URL
echo $DATABASE_URL

# 2. Verificar permissões
ls -la scripts/backup-database.sh
chmod +x scripts/backup-database.sh

# 3. Verificar espaço em disco
df -h

# 4. Verificar logs
./scripts/backup-database.sh 2>&1 | tee backup.log
```

### **Help page não carrega:**

```bash
# 1. Verificar build
npm run build

# 2. Verificar rota
# Deve ser /help

# 3. Verificar componentes UI
# Collapsible deve estar instalado
```

---

## 📞 SUPORTE

### **Recursos:**
- Documentação: `IMPLEMENTACAO_PENDENTE.md`
- Backup: `BACKUP_GUIDE.md`
- Sugestões: `SUGESTOES_ESTRATEGICAS.md`

### **Contato:**
- GitHub Issues: [link do repo]
- Email: [seu email]

---

## ✅ VALIDAÇÃO FINAL

Antes de considerar setup completo, verificar:

```bash
# 1. Analytics
✓ Google Analytics mostrando dados
✓ Hotjar gravando sessões
✓ Eventos sendo rastreados

# 2. Backup
✓ Script executa sem erros
✓ Arquivo gerado tem tamanho razoável
✓ Restore funciona

# 3. Help
✓ Página /help carrega
✓ Busca funciona
✓ Todas as categorias aparecem

# 4. Produção
✓ Site está online
✓ Sem erros no console
✓ Performance boa (<3s)
```

---

**IMPORTANTE: Foque em configurar Analytics HOJE para começar a coletar dados!** 📊

**Próximo passo:** Testar com usuários reais! 🎯
