# Atividade 31 — Banco de alimentos (nutrição do personal)

## Objetivo
Deixar o personal montar refeições **escolhendo alimentos de um catálogo** (com macros por 100g/unidade) e quantidade, calculando os macros da refeição automaticamente — em vez de digitar kcal/proteína/carbo/gordura à mão (como na ativ.27). Catálogo por tenant. Personal-only (gate TRAINING), sem Stripe. Foto→macro por IA (MacroSnap) = backlog.

## Situação atual (ativ.27)
- `Meal` já tem `kcal/proteinG/carbsG/fatG` (digitados à mão) + `logs`. O portal do aluno e o feed do personal leem esses campos do `Meal`.
- `MealPlanPanel` (admin) monta o plano com refeições de macros manuais.

## Decisões de design
- **`Food`** (catálogo por tenant): nome, `basis` (PER_100G | PER_UNIT), `unitLabel` (ex.: "100g", "ovo", "fatia"), macros na base (kcal/proteinG/carbsG/fatG), `isActive`.
- **`MealFood`** (composição): liga `Meal` ↔ `Food` com `quantity` (gramas se PER_100G; contagem se PER_UNIT). Cascade no `mealId`.
- **Macros da refeição derivados dos alimentos**: soma de `food.macro × fator` (`quantity/100` p/ PER_100G; `quantity` p/ PER_UNIT). **Ao salvar, os totais são gravados de volta em `Meal.kcal/proteinG/carbsG/fatG`** → o portal do aluno e o feed do personal **não mudam** (continuam lendo os campos do `Meal`). Backward-compat total.
- **Refeição manual continua válida** (ativ.27): se uma refeição não tem `MealFood`, os macros digitados à mão permanecem. As duas formas coexistem (uma refeição é "composta por alimentos" OU "macros manuais").
- **Contrato do `foods` por refeição (G3/G8 — protege a ativ.27):** `foods` **ausente/undefined** → não toca em MealFood nem recomputa (mantém macros manuais); `foods` = **array não-vazio** → cria/replace MealFood + grava totais (modo alimentos); `foods: []` → limpa MealFood e volta a macros manuais. A UI, ao trocar "alimentos"→"manual", envia `foods:[]`.
- **G1 — editar um `Food` recomputa as refeições que o usam:** o PATCH de `/api/admin/foods` recomputa `computeMealMacros` e regrava `Meal.kcal/...` de todos os Meals afetados (senão o aluno veria macro obsoleto). Limitado (poucas refeições por tenant).
- **G2 — soft-delete de `Food` em uso não perde dado:** o GET dos meal-plans inclui `meal.foods` **mesmo de Food inativo**; o form renderiza os alimentos já vinculados (marcando "inactive"); só o **picker de adicionar** filtra `isActive`; o PUT não descarta MealFood de food inativo.
- **G4 — arredondamento:** acumular em float e **arredondar só o total** (kcal `Math.round`; macros 1 casa).
- **G5 — invariante:** o `clinicId`/tenant é sempre do ator no servidor; `foodId` validado como Food do tenant, nunca de input cru.
- **Catálogo gerenciável** em `/admin/nutrition` (nova página top-level, personal-only via o flag `personalOnly` já criado na ativ.29) + adicionar alimento on-the-fly no meal builder.
- **Gate**: TRAINING. Inglês UK + relabel. `computeMealMacros` no servidor (fonte de verdade), com espelho no client só para preview.

## Modelo de dados (resumo)
```
enum FoodBasis { PER_100G PER_UNIT }
Food { id, clinicId, name, basis(FoodBasis), unitLabel(String), kcal Int, proteinG Float, carbsG Float, fatG Float,
       isActive Boolean @default(true), timestamps }
MealFood { id, mealId(cascade), foodId, quantity Float, order Int, @@index([mealId]) }
```
`Food` indexado por clinicId. Back-relations em Clinic (foods) e Meal (foods). `Food` é catálogo do tenant (não cascateia com plano); `MealFood.foodId` referencia `Food` — política de exclusão na Suposição 3 (proposta: soft-delete do Food).

## Tarefas
| T-N | Nome | Escopo | Status |
|-----|------|--------|--------|
| T-1 | Modelo de dados | `Food` + `MealFood` + enum + relations + `db push` | concluído |
| T-2 | Lib alimentos | `lib/food.ts` (validar food; `computeMealMacros(foods)` → totais; fator por basis) | concluído |
| T-3 | API catálogo + integração | `/api/admin/foods` (CRUD) + POST/PUT de meal-plans aceitando `foods` por refeição e **gravando os totais no Meal** | concluído |
| T-4 | UI | página `/admin/nutrition` (catálogo) + food-picker no `MealPlanPanel` (escolher alimento+qtd, preview de macros) | concluído |
| T-5 | Gating + regressão | personal-only (rota/nav/API); refeições manuais da ativ.27 intactas; portal do aluno inalterado; clínica sem vazamento | concluído |

## Suposições (validar)
1. **v1 sem base pública/USDA** — o catálogo é preenchido pelo personal (poucos alimentos que ele usa). Importar base externa/USDA = backlog.
2. **Macros por 100g OU por unidade** (`basis`); sem porções compostas/receitas aninhadas no v1.
3. **Apagar um `Food` usado**: bloquear (Restrict) com aviso "em uso em N refeições", OU soft-delete (`isActive=false`) e manter as refeições. Proposta: **soft-delete** (isActive=false) — some do picker, refeições existentes seguem com o snapshot de macros já gravado no Meal. Validar.
4. **Refeição é composta-por-alimentos XOR macros-manuais** — ao adicionar alimentos, os campos manuais viram derivados (read-only no form). Trocar de "alimentos"→"manual" envia `foods:[]` (limpa MealFood, volta aos manuais); `foods` ausente nunca toca no que existe. `quantity` pode ser fracionária (ex.: 0,5 unidade).
5. **Catálogo em `/admin/nutrition`** (nova seção personalOnly). Alternativa: aba dentro de Settings.

## Backlog declarado
- Base pública de alimentos (USDA/Open Food Facts) + busca; **foto→macro por IA (MacroSnap)**; receitas (alimento composto); código de barras; porções por medida caseira.

## QA
`qa/qa-spec.md` — unit `computeMealMacros` (100g e unidade); CRUD de food; criar refeição por alimentos → Meal.macros gravados corretos; refeição manual da ativ.27 ainda funciona; portal do aluno mostra os macros (inalterado); soft-delete de food; gating (clínica sem catálogo; cross-tenant 404); regressão nutrição/portal.
