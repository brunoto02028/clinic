# 🛡️ GUIA DE BACKUP E DISASTER RECOVERY

**Sistema:** BPR Clinic  
**Última Atualização:** 01/06/2026

---

## 🎯 VISÃO GERAL

Este guia documenta o sistema de backup automático e procedimentos de recuperação de desastres.

---

## 📦 O QUE É FEITO BACKUP

### **1. Database (PostgreSQL)**
```
✅ Todas as tabelas
✅ Schemas
✅ Indexes
✅ Constraints
✅ Data completa
```

### **2. Uploads (Futuro)**
```
⏳ Scans 3D
⏳ Imagens de pacientes
⏳ Relatórios PDF
⏳ Documentos
```

---

## ⚙️ CONFIGURAÇÃO

### **1. Variáveis de Ambiente**

Adicione ao `.env`:

```bash
# Backup Configuration
BACKUP_DIR=./backups/database
RETENTION_DAYS=30

# Optional: S3 Upload
S3_BUCKET=bpr-clinic-backups
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-west-2
```

### **2. Cron Job (Automático)**

**Linux/Mac:**
```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diário às 2AM)
0 2 * * * cd /path/to/clinic && ./scripts/backup-database.sh >> /var/log/backup.log 2>&1
```

**Railway (Alternativa):**
```bash
# Usar Railway Cron (se disponível)
# Ou criar GitHub Action
```

---

## 🚀 USO

### **Backup Manual**

```bash
# Executar backup agora
./scripts/backup-database.sh

# Com variáveis customizadas
RETENTION_DAYS=60 ./scripts/backup-database.sh
```

### **Verificar Backups**

```bash
# Listar backups
ls -lh backups/database/

# Ver tamanho total
du -sh backups/database/
```

### **Testar Backup**

```bash
# Descompactar
gunzip -c backups/database/backup_20260601_140000.sql.gz > test.sql

# Ver primeiras linhas
head -n 50 test.sql

# Limpar
rm test.sql
```

---

## 🔄 RESTORE (RECUPERAÇÃO)

### **Cenário 1: Restore Completo**

```bash
# 1. Parar aplicação
railway down

# 2. Escolher backup
BACKUP_FILE=backups/database/backup_20260601_140000.sql.gz

# 3. Restore
gunzip -c $BACKUP_FILE | psql $DATABASE_URL

# 4. Verificar
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"

# 5. Reiniciar aplicação
railway up
```

### **Cenário 2: Restore Parcial (Tabela)**

```bash
# 1. Extrair apenas uma tabela
pg_restore -t User backups/database/backup_20260601_140000.sql.gz

# 2. Aplicar
psql $DATABASE_URL < user_table.sql
```

### **Cenário 3: Restore de Produção para Dev**

```bash
# 1. Baixar backup de produção
railway run pg_dump > prod_backup.sql

# 2. Aplicar em dev
psql $DEV_DATABASE_URL < prod_backup.sql

# 3. Sanitizar dados sensíveis
psql $DEV_DATABASE_URL <<EOF
UPDATE "User" SET email = CONCAT('test_', id, '@example.com');
UPDATE "User" SET password = 'hashed_test_password';
EOF
```

---

## 📊 MONITORAMENTO

### **Verificar Último Backup**

```bash
# Ver último backup
ls -lt backups/database/ | head -n 2

# Ver tamanho
du -h backups/database/backup_*.sql.gz | tail -n 1
```

### **Alertas**

Criar script de verificação:

```bash
#!/bin/bash
# check-backup.sh

LAST_BACKUP=$(find backups/database -name "backup_*.sql.gz" -type f -mtime -1 | wc -l)

if [ $LAST_BACKUP -eq 0 ]; then
    echo "⚠️ WARNING: No backup in last 24 hours!"
    # Enviar email/notificação
    exit 1
else
    echo "✅ Backup OK"
    exit 0
fi
```

---

## 🔐 SEGURANÇA

### **Encriptação**

```bash
# Backup encriptado
pg_dump $DATABASE_URL | gzip | openssl enc -aes-256-cbc -salt -out backup_encrypted.sql.gz.enc

# Restore encriptado
openssl enc -aes-256-cbc -d -in backup_encrypted.sql.gz.enc | gunzip | psql $DATABASE_URL
```

### **Permissões**

```bash
# Proteger backups
chmod 600 backups/database/*.sql.gz
chmod 700 backups/database/

# Apenas owner pode ler
ls -la backups/database/
```

---

## ☁️ CLOUD BACKUP (S3)

### **Configurar AWS CLI**

```bash
# Instalar
brew install awscli  # Mac
apt-get install awscli  # Linux

# Configurar
aws configure
```

### **Upload Manual**

```bash
# Upload único
aws s3 cp backups/database/backup_20260601_140000.sql.gz \
  s3://bpr-clinic-backups/database/

# Upload pasta inteira
aws s3 sync backups/database/ s3://bpr-clinic-backups/database/
```

### **Download de S3**

```bash
# Download específico
aws s3 cp s3://bpr-clinic-backups/database/backup_20260601_140000.sql.gz \
  ./restore/

# Listar backups em S3
aws s3 ls s3://bpr-clinic-backups/database/
```

---

## 📅 RETENTION POLICY

### **Estratégia Recomendada**

```
Daily backups: Manter 7 dias
Weekly backups: Manter 4 semanas
Monthly backups: Manter 12 meses
```

### **Implementar**

```bash
# Script de retention inteligente
#!/bin/bash

# Diários (7 dias)
find backups/database -name "backup_*.sql.gz" -type f -mtime +7 -mtime -30 -delete

# Semanais (manter 1 por semana)
# ... lógica customizada

# Mensais (manter 1 por mês)
# ... lógica customizada
```

---

## 🧪 TESTE DE RESTORE

### **Teste Mensal Obrigatório**

```bash
# 1. Criar database de teste
createdb test_restore

# 2. Restore último backup
gunzip -c backups/database/backup_latest.sql.gz | psql test_restore

# 3. Verificar integridade
psql test_restore <<EOF
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "FootScan";
SELECT COUNT(*) FROM "Appointment";
EOF

# 4. Limpar
dropdb test_restore
```

### **Checklist de Teste**

```
□ Backup executa sem erros
□ Arquivo gerado tem tamanho razoável (>1MB)
□ Restore funciona
□ Dados estão íntegros
□ Indexes foram restaurados
□ Foreign keys funcionam
□ Aplicação conecta normalmente
```

---

## 🚨 DISASTER RECOVERY PLAN

### **Cenário 1: Database Corrompido**

```
1. Parar aplicação imediatamente
2. Identificar último backup bom
3. Criar novo database
4. Restore do backup
5. Verificar integridade
6. Apontar aplicação para novo DB
7. Testar funcionalidades críticas
8. Reativar aplicação
```

**Tempo Estimado:** 15-30 minutos

### **Cenário 2: Railway Down**

```
1. Verificar status Railway
2. Preparar ambiente alternativo (Vercel/Render)
3. Restore backup em novo provider
4. Atualizar DNS
5. Migrar tráfego
```

**Tempo Estimado:** 1-2 horas

### **Cenário 3: Perda de Dados Acidental**

```
1. Identificar o que foi perdido
2. Encontrar backup anterior ao incidente
3. Extrair apenas dados necessários
4. Merge com dados atuais
5. Verificar consistência
```

**Tempo Estimado:** 30-60 minutos

---

## 📞 CONTATOS DE EMERGÊNCIA

```
Railway Support: support@railway.app
Database Admin: [seu email]
Backup Storage: AWS S3
```

---

## 📊 MÉTRICAS

### **Acompanhar**

```
- Tamanho médio de backup
- Tempo de execução
- Taxa de sucesso
- Espaço em disco usado
- Último teste de restore
```

### **Dashboard Simples**

```bash
#!/bin/bash
# backup-stats.sh

echo "📊 BACKUP STATISTICS"
echo "===================="
echo ""
echo "Total backups: $(find backups/database -name "backup_*.sql.gz" | wc -l)"
echo "Total size: $(du -sh backups/database/ | cut -f1)"
echo "Latest backup: $(ls -t backups/database/ | head -n 1)"
echo "Latest size: $(du -h backups/database/$(ls -t backups/database/ | head -n 1) | cut -f1)"
echo ""
echo "Oldest backup: $(ls -t backups/database/ | tail -n 1)"
echo ""
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **Inicial**

- [x] Script de backup criado
- [ ] Cron job configurado
- [ ] Variáveis de ambiente definidas
- [ ] Primeiro backup manual executado
- [ ] Teste de restore realizado

### **Semanal**

- [ ] Verificar backups executaram
- [ ] Verificar espaço em disco
- [ ] Verificar logs de erro

### **Mensal**

- [ ] Teste completo de restore
- [ ] Revisar retention policy
- [ ] Atualizar documentação

---

## 🎯 PRÓXIMOS PASSOS

1. **Configurar S3** para backups offsite
2. **Implementar backup de uploads** (scans, imagens)
3. **Criar alertas** para falhas de backup
4. **Automatizar testes** de restore
5. **Documentar RTO/RPO** (Recovery Time/Point Objective)

---

**IMPORTANTE: Teste seu backup ANTES de precisar dele!** 🛡️

**Última Verificação:** [Adicionar data do último teste]  
**Próximo Teste:** [Adicionar data do próximo teste]
