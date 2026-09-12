# T-1: Schema + API base do template (CRUD)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Criar os models `WorkoutTemplate`/`WorkoutTemplateDay`/`WorkoutTemplateExercise` e os 2 campos novos em `Workout` (`scheduledDate`, `templateDayId`), mais as rotas de CRUD do template.

## Contexto
Ver decisões 1 e 2 do plan.md. Os models espelham `Workout`/`WorkoutExercise` (mesmos campos de prescrição: sets/reps/load/rpe/rir/cadence/rest/notes/supersetGroup), mas `WorkoutTemplateDay` não tem `studentId` — pertence ao tenant/trainer.

## Passos
1. `prisma/schema.prisma`: adicionar
   - `WorkoutTemplate { id, clinicId, trainerId, name, description?, weeks Int, isActive, createdAt, updatedAt, days WorkoutTemplateDay[] }`
   - `WorkoutTemplateDay { id, templateId, weekIndex Int, dayOfWeek Int (0-6), name, phase?, order, exercises WorkoutTemplateExercise[] }`
   - `WorkoutTemplateExercise { id, templateDayId, exerciseId, order, supersetGroup?, sets?, repsMin?, repsMax?, loadKg?, rpe?, rir?, cadence?, restSeconds?, notes? }` (mesma forma de `WorkoutExercise`)
   - Em `Workout`: `scheduledDate DateTime?` e `templateDayId String?` com relação opcional pra `WorkoutTemplateDay` (`onDelete: SetNull`) — ambos nullable, não mexe em nenhum registro existente.
   - Índices: `@@index([clinicId])` em `WorkoutTemplate`, `@@index([templateId])` em `WorkoutTemplateDay`, `@@index([templateDayId])` em `Workout`.
2. `npx prisma db push` local pra validar o schema (aditivo, sem perda de dado — igual ao padrão já usado na ativ.31).
3. `lib/workout-access.ts`: reaproveitar `assertTrainingAccess`/`assertExercisesInTenant` (nenhuma mudança nesse arquivo é esperada — só reuso).
4. `app/api/admin/workout-templates/route.ts`:
   - `GET` — lista templates do tenant (`tenantWhere(actor)`), com `days` e contagem de exercícios.
   - `POST` — cria template (`name`, `weeks` 1-12, `description?`), vazio (sem dias ainda — dias entram na T-2).
5. `app/api/admin/workout-templates/[id]/route.ts`:
   - `GET` — detalhe com `days.exercises.exercise` (mesmo shape de include de `app/api/admin/workouts/route.ts`).
   - `PATCH` — editar `name`/`description`/`weeks`/`isActive`. Ownership: 404 se `clinicId` não bate (mesmo padrão do broadcast fix).
   - `DELETE` — apaga template (cascade nos days/exercises; **não** mexe nos `Workout` já atribuídos — eles só perdem o `templateDayId` via `SetNull`).

## Arquivos afetados
- `prisma/schema.prisma`
- `app/api/admin/workout-templates/route.ts` (novo)
- `app/api/admin/workout-templates/[id]/route.ts` (novo)

## Critérios de aceite
- [ ] Migração aplicada local sem perda de dado; `Workout` existentes com os 2 campos novos `null`.
- [ ] CRUD de template funcionando, gated por `assertTrainingAccess` (404 pra CLINIC sem TRAINING).
- [ ] `GET`/`PATCH`/`DELETE` de outro tenant retornam 404, nunca o registro.
