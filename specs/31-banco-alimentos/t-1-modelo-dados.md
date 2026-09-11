# T-1: Modelo de dados

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
`Food` (catálogo por tenant) + `MealFood` (composição da refeição) + enum `FoodBasis`.

## Passos
1. Enum `FoodBasis { PER_100G PER_UNIT }`.
2. `Food` (clinicId, name, basis, unitLabel String @default "100g", kcal Int, proteinG Float, carbsG Float, fatG Float, isActive Boolean @default true, timestamps). Índice clinicId + isActive.
3. `MealFood` (mealId cascade, foodId, quantity Float, order Int @default 0). Índices mealId, foodId. `foodId` → `Food` com `onDelete: Restrict` (o app faz soft-delete do Food; nunca hard-delete um em uso).
4. Back-relations: Clinic (foods), Meal (foods MealFood[]), Food (mealFoods MealFood[]).
5. `npx prisma db push` (local) + `generate`.

## Arquivos afetados
- `prisma/schema.prisma`, DB

## Critérios de aceite
- [ ] `prisma validate` ok; tabelas Food/MealFood; client expõe `food`/`mealFood`.
- [ ] `Meal` inalterado exceto a back-relation `foods`; nada clínico tocado.
