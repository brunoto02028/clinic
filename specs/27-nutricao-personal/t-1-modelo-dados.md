# T-1: Modelo de dados

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Models `MealPlan`, `Meal`, `MealLog` + enum `MealPlanStatus` no Prisma, espelhando o padrão de Workout (clinicId+studentId+trainerId, três camadas), com back-relations e migração aplicada.

## Contexto
Scoping personal: `clinicId` (tenant), `studentId`/`trainerId` → `User`. Filho `Meal` só carrega `mealPlanId` + cascade. `MealLog` recarrega `clinicId`+`studentId` (consultado direto) + índices.

## Passos
1. Em `prisma/schema.prisma`, acima dos models, adicionar `enum MealPlanStatus { ACTIVE PAUSED COMPLETED ARCHIVED }`.
2. Criar `MealPlan` (campos do plan.md), `Meal` (cascade em `mealPlanId`), `MealLog` (clinicId+studentId+mealPlanId, mealId?).
3. **MealLog resiliente a edição do plano (G1):** `mealId String?` com relação `Meal? @relation(..., onDelete: SetNull)`; guardar snapshot `mealName String` e `loggedDate DateTime @db.Date` no próprio log, para o histórico de aderência sobreviver a edições de refeição. Constraint `@@unique([studentId, mealId, loggedDate])` (idempotência do "feito" — G6).
4. Índices `@@index([clinicId])`, `@@index([studentId])`, `@@index([trainerId])`, `@@index([status])` em MealPlan; `@@index([mealPlanId])` em Meal; `@@index([clinicId])`,`@@index([studentId])`,`@@index([mealPlanId])` em MealLog.
5. Back-relations em `Clinic` (mealPlans) e `User` (`StudentMealPlans`, `TrainerMealPlans`, `StudentMealLogs`).
6. `npx prisma migrate dev --name nutrition_meal_plans` (local) + `npx prisma generate`.

## Arquivos afetados
- `prisma/schema.prisma`
- `prisma/migrations/*`

## Critérios de aceite
- [ ] `npx prisma validate` passa.
- [ ] Migração cria as tabelas com FKs/índices corretos.
- [ ] `prisma generate` expõe `prisma.mealPlan/meal/mealLog`.
- [ ] `Meal → MealLog` é `onDelete: SetNull`; `MealLog` tem `mealName` + `loggedDate` + `@@unique([studentId, mealId, loggedDate])`.
- [ ] Nenhuma alteração em models clínicos.
