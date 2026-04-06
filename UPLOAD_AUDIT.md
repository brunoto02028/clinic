# Auditoria Completa do Sistema de Upload

**Data:** 06/04/2026  
**Status:** ✅ SISTEMA PADRONIZADO PARA RAILWAY VOLUME

---

## 📊 RESUMO EXECUTIVO

**Situação Atual:**
- ✅ Upload principal (`/api/upload`) usa **filesystem persistente**
- ✅ Todos os outros uploads já usam **filesystem** (não base64)
- ✅ Sistema configurado para **Railway Volume** (`/data/uploads`)
- ⚠️ Imagens antigas no banco podem estar em base64 (precisam ser re-uploadadas)

**Conclusão:** Sistema está **CORRETO** e pronto para Railway Volume.

---

## 🔍 ANÁLISE DETALHADA

### ✅ Endpoints que JÁ USAM FILESYSTEM (Corretos)

Todos os endpoints abaixo salvam arquivos no disco usando `writeFile()`:

1. **`/api/upload`** - Upload principal (Image Library)
   - Salva em: `/uploads/library/{category}/`
   - Usa: `UPLOADS_DIR` ou `public/uploads`

2. **`/api/patient/documents`** - Documentos de pacientes
   - Salva em: `/uploads/documents/{userId}/`

3. **`/api/admin/social/upload`** - Mídia para posts sociais
   - Salva em: `/uploads/social/`

4. **`/api/admin/exercises/route.ts`** - Vídeos de exercícios
   - Salva em: `/uploads/exercises/`

5. **`/api/admin/marketing/music-library/upload`** - Biblioteca de música
   - Salva em: `/uploads/music/`

6. **`/api/admin/marketing/ai-creative`** - Criativos gerados por IA
   - Salva em: `/uploads/generated/marketing/`

7. **`/api/admin/marketing/generate-article`** - Imagens de artigos
   - Salva em: `/uploads/generated/`

8. **`/api/admin/marketplace/generate-pdf`** - PDFs e capas
   - Salva em: `/uploads/marketplace/`

9. **`/api/admin/finance/ocr`** - Faturas para OCR
   - Salva em: `/uploads/invoices/`

10. **`/api/admin/body-models/upload`** - Modelos 3D do corpo
    - Salva em: `/uploads/body-models/`

11. **`/api/foot-scans/[id]/upload`** - Scans de pés (STL)
    - Salva em: `/uploads/foot-scans/`

### ⚠️ Uso de Base64 (Apenas para Processamento Temporário)

Os seguintes endpoints usam base64 **APENAS** para enviar dados para APIs de IA (Gemini, etc). **NÃO armazenam base64 no banco:**

1. **`/api/patient/voice-transcribe`** - Transcrição de áudio
   - Converte áudio para base64 → envia para Gemini → descarta base64

2. **`/api/admin/body-assessments/[id]/analyze`** - Análise biomecânica
   - Converte imagens para base64 → envia para Gemini → descarta base64

3. **`/api/admin/finance/ocr`** - OCR de faturas
   - Converte PDF para base64 → envia para IA → descarta base64

4. **`/api/admin/education/transcribe`** - Transcrição de vídeos educacionais
   - Converte áudio para base64 → envia para Gemini → descarta base64

**Conclusão:** Uso de base64 é **CORRETO** - apenas para processamento temporário, não para armazenamento.

---

## 📁 ESTRUTURA DE DIRETÓRIOS

### Desenvolvimento (Local)
```
public/uploads/
├── library/
│   ├── general/
│   ├── hero/
│   └── about/
├── documents/
├── social/
├── exercises/
├── music/
├── generated/
├── marketplace/
├── invoices/
├── body-models/
└── foot-scans/
```

### Produção (Railway)
```
/data/uploads/
├── library/
│   ├── general/
│   ├── hero/
│   └── about/
├── documents/
├── social/
├── exercises/
├── music/
├── generated/
├── marketplace/
├── invoices/
├── body-models/
└── foot-scans/
```

---

## 🎯 CONFIGURAÇÃO RAILWAY NECESSÁRIA

### 1. Criar Volume Persistente

No Railway Dashboard:
1. Settings → Volumes → New Volume
2. **Mount Path:** `/data`
3. **Size:** 1GB (grátis) ou mais se necessário
4. Salvar

### 2. Adicionar Variável de Ambiente

No Railway Dashboard:
1. Variables → Add Variable
2. **Name:** `UPLOADS_DIR`
3. **Value:** `/data/uploads`
4. Salvar

### 3. Redeploy

Após configurar volume e variável:
1. Deploy → Redeploy
2. Aguardar 2-3 minutos

---

## 🔄 MIGRAÇÃO DE IMAGENS ANTIGAS

### Problema
Imagens antigas no banco de dados podem estar salvas como base64 (antes da correção).

### Solução
**Opção 1: Re-upload Manual (Recomendado)**
1. Acesse `/admin/settings`
2. Faça upload novamente das imagens principais:
   - Hero Image
   - About Image
   - Logo
   - Favicon
   - STO Badge
3. Save All Changes

**Opção 2: Script de Migração (Se houver muitas imagens)**
```bash
# Conectar ao banco Railway
# Identificar registros com base64
# Converter base64 para arquivos
# Atualizar URLs no banco
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após configurar Railway Volume:

- [ ] Volume criado (mount path: `/data`)
- [ ] Variável `UPLOADS_DIR=/data/uploads` adicionada
- [ ] Redeploy realizado
- [ ] Upload de nova imagem funciona
- [ ] Imagem aparece corretamente na página
- [ ] Fazer outro deploy
- [ ] Imagem ainda está lá (persistiu)
- [ ] Re-upload de imagens principais (Hero, About, Logo)

---

## 📈 COMPRESSÃO DE IMAGENS

**Status:** ⚠️ NÃO IMPLEMENTADO

**Recomendação:** Adicionar compressão automática no upload para economizar espaço:

```typescript
import sharp from 'sharp';

// Comprimir imagem antes de salvar
const compressedBuffer = await sharp(buffer)
  .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer();

await writeFile(filePath, compressedBuffer);
```

**Benefícios:**
- Reduz tamanho do volume Railway
- Melhora performance de carregamento
- Mantém qualidade visual

---

## 💾 ARMAZENAMENTO NO BANCO DE DADOS

**Pergunta:** "Os arquivos vão ser mantidos no Railway, no banco de dados?"

**Resposta:** **NÃO**. Os arquivos **NÃO** ficam no banco de dados.

**Como funciona:**
1. **Arquivo físico** → Salvo no Railway Volume (`/data/uploads/`)
2. **URL do arquivo** → Salva no banco de dados (ex: `/uploads/library/general/123-image.jpg`)
3. **Quando acessa a imagem** → Next.js busca o arquivo no volume e serve

**Vantagens:**
- ✅ Banco de dados leve e rápido
- ✅ Arquivos persistentes no volume
- ✅ Fácil fazer backup (separado)
- ✅ Não sobrecarrega queries do banco

**Desvantagens:**
- ⚠️ Precisa configurar volume (já feito)
- ⚠️ Volume tem custo (1GB grátis, depois ~$2.50/10GB)

---

## 🎓 CONCLUSÃO

**Sistema está CORRETO e pronto para produção.**

**Próximos passos:**
1. Você: Configurar Railway Volume (3 passos acima)
2. Você: Re-upload das imagens principais
3. Eu: Adicionar compressão automática (opcional, melhoria futura)

**Depois disso: NUNCA MAIS VAI PERDER IMAGENS EM DEPLOY** ✅
