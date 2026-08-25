# QA — Spec 12 (URLs por idioma nos artigos)

**Data:** 2026-08-25
**Ambiente:** dev local (`next dev`, porta limpa), curl (SSR) + Playwright.
**Resultado:** ✅ Aprovado.

> Como o DB local não tinha nenhuma tradução PT, foi inserido conteúdo PT de teste em **1** artigo (`trochanteric-bursitis`) só para o QA e **revertido** ao final. Em **produção há 35/35 artigos com PT**, então todas as URLs `/pt` acendem lá.

## Cenários

| # | Cenário | Esperado | Resultado |
|---|---------|----------|-----------|
| 1 | `GET /articles/<slug>` (EN) | 200, canonical EN, conteúdo EN | ✅ 200, `canonical=…/articles/<slug>`, sem texto PT |
| 2 | `GET /pt/articles/<slug>` (com PT) | 200, **PT server-side**, canonical PT | ✅ 200, título+corpo PT no HTML, `canonical=…/pt/articles/<slug>` |
| 3 | `GET /pt/articles/<slug>` (sem PT) | 404 | ✅ 404 (`patellar-tendinopathy` e slug inexistente) |
| 4 | hreflang recíproco | EN e PT listam en-GB + x-default + pt-BR | ✅ (via `hrefLang`, case-insensitive) nas duas rotas |
| 5 | Cross-link visível | "Read in English" na PT; "Ler em português" na EN (só quando há PT) | ✅ ambos navegam corretamente |
| 6 | Toggle EN/PT do header | navega entre as duas URLs (não traduz in-place) | ✅ EN→PT e PT→EN via header |
| 7 | Sem redirect no load | abrir `/pt` não pula pra EN | ✅ (corrigido bug de StrictMode no bridge) |
| 8 | Sitemap | inclui `/pt/articles/<slug>` + `alternates` | ✅ URL PT presente 3× (loc própria + alternates recíprocos) |
| 9 | Layout | header/footer públicos na rota `/pt` | ✅ (`app/pt/articles/layout.tsx`) |
| 10 | Typecheck | 0 erros nos arquivos da spec | ✅ |

## Detalhes técnicos
- **Render server-side por idioma:** `ArticleView({article, lang})` escolhe os campos (`titlePt/excerptPt/contentPt` vs `…En`) no servidor — nada de tradução client-side no conteúdo principal (era o que impedia o Google de ver o PT).
- **hreflang/canonical:** `buildArticleMetadata(article, lang)` — canonical de si mesmo; `alternates.languages` só emite `pt-BR` quando `contentPt` existe (nunca aponta pra 404/duplicado).
- **404 sem tradução:** `notFound()` quando `!hasPtVersion` — evita página fina/duplicada.
- **Bridge do toggle (`lang-sync.tsx`):** navega só em **transição real** do locale (guarda valor anterior) — robusto sob React StrictMode; não redireciona no load (preserva URL compartilhável e crawler).
- **Bug encontrado e corrigido no QA:** primeira versão do bridge (com alinhamento via `setGlobalLocale`) redirecionava a página PT pra EN no mount (efeito duplo do StrictMode). Reescrito para a abordagem por transição.

## Evidência
- `qa/screenshots/qa-pt-article.png` — página PT renderizada server-side (breadcrumb, meta, sidebar e cross-link "Read in English" em português).

## Fora de escopo (confirmado)
- `slugPt`, tradução dos artigos faltantes (conteúdo), e `/pt/` para home/serviços — não incluídos (spec define).
