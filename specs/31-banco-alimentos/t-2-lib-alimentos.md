# T-2: Lib alimentos

**Status:** concluído
**Depende de:** T-1

## Objetivo
Validação de alimento + cálculo dos macros de uma refeição a partir dos alimentos.

## Passos
1. `lib/food.ts`:
   - `validateFood(input): string|null` (nome; basis válido; kcal inteiro ≥0 e ≤ limite; macros ≥0; unitLabel não vazio).
   - `factor(basis, quantity)` → `PER_100G` = quantity/100; `PER_UNIT` = quantity.
   - `computeMealMacros(items: {food:{basis,kcal,proteinG,carbsG,fatG}, quantity}[])` → `{ kcal, proteinG, carbsG, fatG }`. **G4: acumular em float e arredondar SÓ o total** (kcal `Math.round`; macros 1 casa) — nunca somar itens já arredondados (evita drift).

## Arquivos afetados
- `lib/food.ts` (novo)

## Critérios de aceite
- [ ] `validateFood` rejeita nome vazio/basis inválido/negativos.
- [ ] `computeMealMacros`: 200g de um alimento 100kcal/100g → 200 kcal; 2 unidades de 70kcal/un → 140 kcal; soma de vários correta (teste unitário).
