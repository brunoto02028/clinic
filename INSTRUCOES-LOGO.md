# INSTRUÇÕES PARA CORRIGIR O LOGO DEFINITIVAMENTE

## PROBLEMA:
O logo "BPR ." aparece porque não há logo válido no banco de dados.

## SOLUÇÃO RÁPIDA (5 minutos):

### 1. Baixar o Logo Correto
Você tem o logo correto salvo em algum lugar? Se sim, pule para o passo 2.

Se não, você precisa do arquivo `Novo_logo_Bruno2.png` original.

### 2. Fazer Upload via Admin
1. Acesse: https://bpr.rehab/admin/media
2. Clique em **"Upload"** ou arraste o arquivo do logo
3. Selecione a categoria: **"Logo"**
4. Aguarde o upload completar
5. Verifique que aparece na biblioteca

### 3. Configurar o Logo
1. Acesse: https://bpr.rehab/admin/settings
2. Role até **"Logo (Light Background)"**
3. Clique em **"Set Logo"**
4. Selecione o logo que você acabou de fazer upload
5. Clique em **"Select Image"**
6. Faça o mesmo para **"Logo (Dark Background)"**
7. Clique em **"Save All Changes"**

### 4. Verificar
1. Recarregue a home: https://bpr.rehab
2. Pressione **Ctrl+Shift+R** (ou Cmd+Shift+R no Mac) para limpar cache
3. O logo correto deve aparecer

---

## ALTERNATIVA: Script Automático

Se você tem o arquivo do logo em `/Users/brunotoaz/Downloads/Novo_logo_Bruno2.png`:

```bash
npx tsx scripts/upload-logo-fix.ts
```

Isso fará upload automático e configurará tudo.

---

## SOBRE AS IMAGENS "NO IMAGE":

Essas são imagens com URLs quebradas (`/uploads/...` que não existem mais).

**Para deletar em massa:**
1. Acesse: https://bpr.rehab/admin/media
2. Marque os checkboxes das imagens "No Image"
3. Clique em **"Delete (X)"**
4. Confirme

**Nota:** O contador pode mostrar número errado devido a cache do navegador. Ignore e clique em Delete mesmo assim.

---

## SOBRE VELOCIDADE DAS IMAGENS:

As imagens na home são data URLs (base64), que são grandes e demoram.

**Para melhorar:**
- Use imagens menores (< 300KB)
- Comprima antes de fazer upload
- Use ferramentas como TinyPNG ou Squoosh

---

## PRECISA DE AJUDA?

Se nada disso funcionar, me avise e eu crio uma solução diferente.
