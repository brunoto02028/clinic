# T-1: Card "Getting started" no dashboard admin

**Status:** concluído (QA + review)
**Depende de:** nenhuma

## Objetivo
Checklist contextual no dashboard do admin personal, dispensável, com 5 passos acionáveis.

## Passos
1. `components/admin/studio-getting-started.tsx`: renderiza só se `isPersonal` (useVocab); prop `studentCount`. 5 passos com link; passo "Convide o 1º aluno" marcado quando `studentCount > 0`. Botão "Dismiss" persistente (localStorage `bpr-studio-getting-started-dismissed`).
2. Link "Full guide →" para `/admin/studio-guide`.
3. Montar em `app/admin/page.tsx` (após o card de links), passando `studentCount = stats?.totalPatients`.

## Arquivos afetados
- `components/admin/studio-getting-started.tsx`, `app/admin/page.tsx`

## Critérios de aceite
- [ ] Trainer vê o card com 5 passos; some ao dispensar (persistente).
- [ ] "Convide o 1º aluno" concluído quando há aluno.
- [ ] Clínica não vê o card.
