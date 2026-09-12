# T-3: Atribuição em massa (template → N alunos)

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
Atribuir um `WorkoutTemplate` a um ou vários alunos de uma vez, gerando os `Workout`/`WorkoutExercise` concretos de cada um a partir do template.

## Contexto
Ver decisão 3 e Suposição "data de início única" do plan.md. Cada aluno recebe sua própria cópia de `Workout` (independente — editar o treino de um aluno depois não afeta o template nem os outros alunos, a menos que o treinador use o "Enviar atualizações" da T-4).

## Passos
1. `app/api/admin/workout-templates/[id]/assign/route.ts`:
   - `POST` — body `{ studentIds: string[], startDate: string }`.
   - Validar `assertPatientAccess(actor, studentId)` pra cada aluno (404 silencioso se algum não pertencer ao tenant — não interrompe os outros, mas não atribui pro que falhou).
   - Pra cada aluno × cada `WorkoutTemplateDay`: calcular `scheduledDate` = `startDate` + (`weekIndex * 7 + diferença até o próximo dayOfWeek`) e criar `Workout` com `studentId`, `templateDayId`, `scheduledDate`, `daysOfWeek: [dayOfWeek]`, `name`/`phase` copiados do day, e `exercises: { create: [...] }` copiando cada `WorkoutTemplateExercise`.
   - Operação em transação por aluno (um aluno falhar não deve deixar outro com dados parciais).
2. UI no editor do template (T-2): botão "Atribuir" → modal com seleção multi-aluno (reaproveitar o mesmo picker de paciente já usado em `/admin/notifications`, ver `app/api/admin/patients?limit=500`) + campo de data de início.
3. Tela do template mostra "Atribuído a N alunos" com link pra cada.

## Arquivos afetados
- `app/api/admin/workout-templates/[id]/assign/route.ts` (novo)
- `app/admin/training-programs/[id]/page.tsx` (modal de atribuição)

## Critérios de aceite
- [ ] Atribuir a 3 alunos gera os `Workout` corretos pra cada um, com `scheduledDate` batendo com o calendário esperado.
- [ ] Aluno de outro tenant no `studentIds` é ignorado (não atribuído, não quebra o restante).
- [ ] Editar o `Workout` de um aluno depois da atribuição não altera o template nem os outros alunos.
