# T-3: API catálogo + integração no meal-plan

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
CRUD do catálogo de alimentos e integração: refeições podem ser compostas por alimentos, gravando os totais nos campos de macro do `Meal`.

## Passos
1. `app/api/admin/foods/route.ts` (GET lista ativos do tenant, POST cria) + `[id]` (PATCH edita, DELETE = **soft-delete** `isActive=false`). Gate `assertNutritionAccess`; `validateFood`. Invariante G5: clinicId do ator, nunca de input.
   - **G1**: no PATCH que muda macros/basis, recomputar os Meals afetados — `mealFood.findMany({where:{foodId}})` → por `mealId`, recomputar `computeMealMacros` (com todos os foods do meal) e gravar em `Meal`.
2. Integração em `/api/admin/meal-plans` (POST) e `[id]` (PUT) — **contrato G3/G8 por refeição**:
   - `foods` **ausente** → não toca em MealFood nem recomputa (mantém macros manuais — protege ativ.27).
   - `foods` **não-vazio** → validar cada `foodId` como `Food` **do tenant** (ativo OU já vinculado — G2; senão 400); replace dos MealFood da refeição; **`computeMealMacros` → grava `Meal.kcal/proteinG/carbsG/fatG`**.
   - `foods: []` → limpa os MealFood da refeição e usa os macros manuais enviados (senão 0).
3. GET dos meal-plans inclui `meals.foods` (com o `food`, **mesmo inativo** — G2) para o form reconstruir sem perder itens.

## Arquivos afetados
- `app/api/admin/foods/route.ts` (+ `[id]`)
- `app/api/admin/meal-plans/route.ts`, `[id]/route.ts` (aceitar foods + gravar totais)

## Critérios de aceite
- [ ] CRUD de food; DELETE só soft-delete (não some do histórico).
- [ ] Criar/editar refeição com `foods` grava os `MealFood` e os totais corretos no `Meal`.
- [ ] Refeição sem `foods` mantém macros manuais (ativ.27 intacta).
- [ ] foodId de outro tenant/inativo → 400; gate CLINIC → 404.
