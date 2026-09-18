# 12 — URLs por idioma nos artigos (SEO bilíngue)

## Problema
Cada artigo tem **uma URL** (`/articles/[slug]`). O servidor renderiza só o idioma
principal (`publishLanguage`, hoje EN); o toggle PT/EN é client-side
(`app/articles/[slug]/localized.tsx`). Resultado: **o Google nunca rastreia o
português** — a tradução só existe depois do JS, para um humano. Toda versão PT é
invisível para busca.

## Objetivo
Dar ao Google duas páginas server-renderizadas por artigo (EN e PT), amarradas por
`hreflang`, sem quebrar as URLs inglesas já indexadas/compartilhadas.

## Decisões (tomadas no brainstorm)
- Prefixo de idioma: **`/pt/`** (subpasta). EN continua em `/articles/[slug]` sem mudança.
- Slug: **reaproveitar** o slug inglês em `/pt/articles/[slug]` (sem `slugPt`, sem backfill).
- Artigo sem tradução: a URL PT **não existe** (404) — nada de página fina/duplicada.
  Com isso o aviso de fallback (commit 0c885aa) fica só para o toggle legado, se mantido.
- `?lang=` fica descartado (ruim para SEO).

## Escopo — o que muda
1. **Rota nova** `app/pt/articles/[slug]/page.tsx`
   - Reusa a lógica de `app/articles/[slug]/page.tsx`, mas renderiza os campos PT
     (`titlePt/excerptPt/contentPt`) direto no server.
   - Se `contentPt` vazio → `notFound()`.
   - Extrair o corpo comum para evitar duplicar 446 linhas (componente/loader compartilhado).
2. **Canonical + hreflang** em `generateMetadata` das duas rotas
   - Cada URL canônica de si mesma (hoje as duas apontariam para a EN — corrigir).
   - `alternates.languages`: `en` → `/articles/[slug]`, `pt-BR` → `/pt/articles/[slug]`,
     `x-default` → EN. Só emitir a entrada PT **quando `contentPt` existe**.
   - `og:locale` / título / description no idioma da página (hoje usam só o primário).
3. **Toggle vira link real** (`localized.tsx`)
   - PT/EN passam a ser `<a href>` entre as duas URLs em vez de estado client-side,
     preservando posição de scroll quando possível.
   - Some quando a outra língua não existe.
4. **Sitemap** (`app/sitemap.ts`)
   - Adicionar a URL `/pt/articles/[slug]` para cada artigo com `contentPt`, cada
     entrada com seus `alternates`.
5. **Middleware/redirect** (verificar)
   - Garantir que `/pt/articles/<slug-sem-PT>` responde 404, não 200 com fallback EN.

## Fora de escopo
- Slug traduzido (`slugPt`) — avaliar depois; ganho marginal.
- Traduzir os artigos que ainda faltam — é conteúdo, não código.
- Home/outras páginas em `/pt/` — só artigos nesta atividade.

## Riscos
- Não regenerar/alterar o slug inglês: URLs indexadas devem continuar 200.
- Duplicate content se a PT servir fallback EN — o guard `notFound()` é o que evita.
- `generateMetadata` roda no server: conferir `headers()`/`force-dynamic` já em uso.

## Tarefas (rascunho)
- t-1: extrair loader/corpo comum de `app/articles/[slug]` para reuso
- t-2: rota `app/pt/articles/[slug]` (render PT + notFound sem tradução)
- t-3: canonical + hreflang + og/locale nas duas rotas
- t-4: toggle PT/EN como link entre URLs
- t-5: sitemap com URLs PT + alternates
- t-6: QA (qa-tester): 200/404 corretos, view-source mostra PT server-side,
  hreflang recíproco, sitemap, Rich Results/hreflang válido

## Ciclo por tarefa
implementar → qa-tester gera `qa/report-t-N.md` → code review → marcar concluído.

## Progresso — CONCLUÍDO (2026-08-25)
Implementado e QA-aprovado localmente (ver `qa/report.md`). Também resolve o **S1/hreflang** da spec 17 (para artigos).
- t-1 ✅ loader/corpo comum extraído → `app/articles/[slug]/shared.ts` + `article-view.tsx`
- t-2 ✅ rota `app/pt/articles/[slug]/page.tsx` (render PT server-side + `notFound()` sem tradução) + `layout.tsx`
- t-3 ✅ canonical + hreflang recíproco + og:locale nas duas rotas (`buildArticleMetadata`)
- t-4 ✅ toggle vira link real entre URLs (`lang-sync.tsx` — navega em transição do locale) + cross-link visível
- t-5 ✅ sitemap com URLs `/pt` + `alternates`
- t-6 ✅ QA local: 200/404 corretos, PT server-side no view-source, hreflang recíproco, sitemap

Arquivos: `app/articles/[slug]/{shared.ts,article-view.tsx,lang-sync.tsx,page.tsx}`, `app/pt/articles/[slug]/{page.tsx,layout.tsx}`, `app/sitemap.ts`, `middleware.ts`.
