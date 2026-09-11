# T-5: Gating + regressão

**Status:** concluído
**Depende de:** T-3, T-4

## Objetivo
Catálogo/alimentos 100% personal-only; refeições manuais e portal do aluno intactos; clínica sem vazamento.

## Passos
1. Seção "Nutrition" (`personalOnly`) + página `/admin/nutrition` (guarda server-side) + APIs gated (`assertNutritionAccess`).
2. Confirmar backward-compat: refeições da ativ.27 (macros manuais, sem MealFood) continuam salvando/exibindo; o **portal do aluno e o feed do personal não mudaram** (leem `Meal.kcal/...`, que agora é gravado dos alimentos quando há).
3. Regressão: clínica não vê "Nutrition"; cross-tenant no /api/admin/foods → 404; nada clínico tocado.

## Critérios de aceite
- [ ] Tenant CLINIC: sem seção/página/rotas de alimentos.
- [ ] Tenant PERSONAL: catálogo + refeição por alimentos funcionais.
- [ ] Refeições manuais e portal do aluno sem regressão.
- [ ] Nav da clínica inalterada (o flag personalOnly já cobre os dois ramos).
