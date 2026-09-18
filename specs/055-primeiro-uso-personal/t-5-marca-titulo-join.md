# T-5: Marca do estúdio no título das páginas e no /join

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Páginas do estúdio e do aluno de estúdio mostram o nome do estúdio na aba do navegador; `/join/<slug>` de estúdio sem cabeçalho/rodapé do site da BPR.

## Contexto
Achado A6 e print online de 18/09.

## Passos
1. `generateMetadata` em `/studio/[slug]`, `/join/[slug]` e no layout do portal (aluno de estúdio → nome do estúdio).
2. `/join` de estúdio sem `SiteHeader`/`SiteFooter` da BPR.

## Arquivos afetados
- `app/studio/[slug]/page.tsx`
- `app/join/[slug]/page.tsx`
- `app/dashboard/layout.tsx`

## Critérios de aceite
- [ ] `<title>` com o nome do estúdio nas três.
- [ ] Clínica, `/login` e `/join` de clínica iguais.
