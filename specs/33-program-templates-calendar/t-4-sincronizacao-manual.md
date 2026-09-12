# T-4: Sincronização manual (push de atualizações)

**Status:** concluído
**Depende de:** T-3

## Objetivo
Botão "Enviar atualizações" no template: propaga a versão atual do template pros `Workout` já atribuídos que ainda não foram iniciados/concluídos.

## Contexto
Ver decisão 4 do plan.md — sob demanda, nunca reescreve histórico.

## Passos
1. `app/api/admin/workout-templates/[id]/sync/route.ts`:
   - `POST` — busca todos os `Workout` com `templateDayId` apontando pra algum day deste template, `scheduledDate >= hoje` **e** sem nenhum `WorkoutLog` associado (`logs: { none: {} }`).
   - Pra cada um: apagar `WorkoutExercise` atuais e recriar a partir do `WorkoutTemplateExercise` correspondente (mesmo `templateDayId`); atualizar `name`/`phase` se mudaram no template.
   - Retornar contagem de quantos `Workout` foram atualizados e quantos foram pulados (já iniciados).
2. UI: botão no editor do template com confirmação ("Isso vai atualizar N treinos futuros ainda não iniciados. M treinos já iniciados não serão alterados.") — o preview de N/M vem de uma checagem prévia (`GET` do mesmo endpoint ou um `?dryRun=1`).

## Arquivos afetados
- `app/api/admin/workout-templates/[id]/sync/route.ts` (novo)
- `app/admin/training-programs/[id]/page.tsx` (botão + confirmação)

## Critérios de aceite
- [ ] Editar um dia do template e sincronizar atualiza os `Workout` futuros correspondentes, em todos os alunos atribuídos.
- [ ] `Workout` com `WorkoutLog` (já iniciado/concluído) não é alterado pela sincronização.
- [ ] `Workout` com `scheduledDate` no passado não é alterado.
