# T-2: Página "How it works" (`/admin/studio-guide`)

**Status:** concluído (QA + review)
**Depende de:** T-1

## Objetivo
Local de referência que ensina o trainer a usar o sistema, alcançável pelo card.

## Passos
1. `app/admin/studio-guide/page.tsx`: página com os 5 passos expandidos (o quê + por quê + link para a tela), em cards com ícone. Inglês UK.
2. (Guarda) se acessado por tenant não-personal, mostrar conteúdo genérico ou redirecionar — manter simples (personal-first).

## Arquivos afetados
- `app/admin/studio-guide/page.tsx`

## Critérios de aceite
- [ ] Página abre e lista os passos com links úteis; o card "Getting started" leva até ela.
