# T-2: Lib nutrição + acesso

**Status:** concluído
**Depende de:** T-1

## Objetivo
Funções puras de validação e cálculo em `lib/nutrition.ts` e o gate de acesso em `lib/nutrition-access.ts` (delegando ao gate de training).

## Contexto
Convenção do projeto: validadores puros retornam `string | null` (mensagem de erro ou null), como `validateAssessment` em `lib/assessment.ts`. Gate reutiliza `lib/workout-access.ts`.

## Passos
1. `lib/nutrition.ts`:
   - `interface MealPlanInput { name; targetKcal?; targetProteinG?; targetCarbsG?; targetFatG?; notes?; meals: MealInput[] }`.
   - `validateMealPlan(input): string | null` — nome obrigatório; macros/meals ≥ 0; refeições com nome; limites sãos (kcal ≤ 20000, etc.).
   - `sumMealMacros(meals)` → totais planejados (para comparar com metas).
   - `adherence(logs, meals, rangeDays)` → `{ logged, planned, pct }`. **Fórmula fixa (G7):** `planned = (nº de refeições ativas) × (dias no período)`; `logged = nº de MealLog distintos por (mealId, loggedDate)` no período; `pct = clamp(logged/planned, 0..1)`. Dia/semana definidos no fuso do tenant (`clinicTimezone` do Clinic; fallback `CLINIC_TIMEZONE`).
2. `lib/nutrition-access.ts`:
   - `assertNutritionAccess(actor)` → delega `assertTrainingAccess(actor)` (staff).
   - `assertStudentNutritionAccess(actor)` → delega `assertStudentTrainingAccess(actor)`.
   - `isNutritionEnabled(clinicId)` → `isTrainingEnabled(clinicId)`.
   (Wrappers finos para trocar por módulo próprio depois sem mexer nas rotas.)

## Arquivos afetados
- `lib/nutrition.ts` (novo)
- `lib/nutrition-access.ts` (novo)

## Critérios de aceite
- [ ] `validateMealPlan` rejeita nome vazio, macro negativo, refeição sem nome; aceita plano válido.
- [ ] `sumMealMacros`/`adherence` corretos em teste unitário simples (ou verificação manual documentada).
- [ ] Gates delegam corretamente e lançam `AccessError` para não-staff / cross-tenant.
