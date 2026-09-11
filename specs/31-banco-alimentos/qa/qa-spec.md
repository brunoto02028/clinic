# QA Spec — Atividade 31 (Banco de alimentos)

Tenant PERSONAL_TRAINER (TRAINING on) admin + aluno + tenant CLINIC (regressão). en-GB. Fixtures limpas.

## T-1 Modelo
- `prisma validate` ok; tabelas Food/MealFood; client expõe. Meal só ganhou back-relation; nada clínico tocado.

## T-2 Lib
- **Unit** `validateFood`: nome vazio / basis inválido / kcal negativo → erro; válido → null.
- **Unit** `computeMealMacros`: 200g de 100kcal/100g → 200 kcal; 2× de 70kcal/un → 140; soma de itens mistos correta; arredondamento (kcal int, macros 1 casa).

## T-3 API
- **API foods** POST cria; GET lista ativos; PATCH edita; DELETE → soft-delete (isActive=false, some do GET).
- **API meal-plan c/ foods** POST/PUT refeição com `foods:[{foodId,quantity}]` → cria MealFood e grava `Meal.kcal/proteinG/carbsG/fatG` = totais computados.
- **API backward-compat** refeição sem `foods` → macros manuais preservados.
- **API inválido/scope** foodId de outro tenant ou inativo → 400; sem sessão 401; CLINIC → 404 (gate).

## T-4 UI
- **UI catálogo** `/admin/nutrition`: criar/editar/soft-delete alimento (basis 100g/unidade).
- **UI meal builder** escolher alimentos + qtd → macros calculados exibidos (read-only); salvar persiste; total bate com o catálogo.
- **UI manual** refeição sem alimentos ainda salva com macros digitados.
- **UI regressão** CLINIC não vê "Nutrition".

## Gaps do plano (cobertura extra)
- **G1** editar macros de um Food usado → os Meals que o usam têm `Meal.kcal/...` recomputados (aluno não vê valor obsoleto).
- **G2** soft-delete de um Food em uso → reabrir e salvar o plano preserva o item vinculado (não some); só o picker de adicionar o esconde.
- **G3/G8** contrato: `foods` ausente não mexe (refeição manual da ativ.27 intacta); `foods:[]` volta a manual; `foods` não-vazio grava totais.
- **G4** arredondamento: 3 itens fracionários → total = arredondar-a-soma (sem drift).

## T-5 Gating + regressão
- CLINIC: sem seção/página/rotas de alimentos; cross-tenant 404.
- PERSONAL: tudo funcional.
- Refeições manuais (ativ.27) e **portal do aluno** exibindo macros — sem regressão (aluno vê os macros vindos dos alimentos gravados no Meal).
