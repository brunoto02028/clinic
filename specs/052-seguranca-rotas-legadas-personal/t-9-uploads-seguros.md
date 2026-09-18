# T-9: Uploads — tipo/tamanho permitidos e SVG/HTML nunca inline

**Status:** pendente
**Depende de:** T-1 (a parte "aluno" já cai no 403)

## Objetivo
Nenhum upload vira XSS no domínio da plataforma. Só entram tipos esperados, com limite de tamanho, e o que pode carregar script nunca é servido inline.

## Contexto
- `app/api/admin/social/upload/route.ts:12-36`: qualquer sessão (inclusive aluno, até a T-1) grava arquivo com **extensão livre e sem limite de tamanho**.
- `app/api/uploads/[...path]/route.ts:13`: serve `.svg` como `image/svg+xml` na mesma origem. Um SVG com `<script>` aberto pelo admin roda com a sessão dele, o que é escalada para staff.
- A confirmar na execução: como o nginx/Coolify serve `/uploads/*` em prod (se passa pela rota Next ou sai direto do disco).

## Passos
1. `social/upload`:
   - só staff (ADMIN/SUPERADMIN);
   - allowlist de tipos (jpg, jpeg, png, webp, gif, mp4, mov, webm), checando extensão **e** MIME;
   - limite de tamanho (imagem 10 MB, vídeo 200 MB, ou o que o fluxo do Instagram precisar);
   - nome gerado pelo servidor.
2. `uploads/[...path]`:
   - `X-Content-Type-Options: nosniff` em tudo;
   - `.svg`, `.html`, `.htm`, `.xml` e desconhecidos → `Content-Disposition: attachment` + `Content-Security-Policy: sandbox`;
   - bloquear path traversal (conferir se já está).
3. Conferir outras rotas de upload do admin/aluno (assessment photos, documentos, logo da T-3) com o mesmo helper de validação, se já não validarem.
4. Documentar como `/uploads` é servido em prod e, se for pelo nginx, ajustar os headers lá (ou anotar como pendência de infra para você).

## Arquivos afetados
- `app/api/admin/social/upload/route.ts`
- `app/api/uploads/[...path]/route.ts`
- helper de validação de upload (novo ou existente em `lib/`)

## Critérios de aceite
- [ ] Aluno → upload → 403 (T-1). Personal → upload de `x.svg`/`x.html`/`x.exe` → 400.
- [ ] Personal → upload de `.jpg` válido → 200. Arquivo acima do limite → 413/400.
- [ ] Um SVG já existente em `/api/uploads/...` é servido como anexo com CSP sandbox (não executa script ao abrir).
- [ ] Imagens e vídeos existentes (Instagram, exercícios) continuam aparecendo (regressão).
