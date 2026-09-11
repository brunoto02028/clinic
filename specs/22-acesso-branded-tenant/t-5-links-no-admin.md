# T-5: Exibir links do estúdio no admin do personal

**Status:** pendente
**Depende de:** T-1

## Objetivo
O trainer encontra e copia facilmente os links do estúdio para distribuir aos alunos.

## Contexto
D7. Local natural: settings/dashboard do admin (só quando `isPersonal`).

## Passos
1. Em `app/admin/settings` (ou dashboard do admin), bloco "Your studio links" quando tenant personal.
2. Mostrar `/studio/[slug]` (login do aluno) e `/join/[slug]` (convite) com botão copiar.

## Arquivos afetados
- `app/admin/settings/page.tsx` (ou componente de dashboard admin).

## Critérios de aceite
- [ ] Trainer vê e copia os dois links; só aparece para tenant personal.
