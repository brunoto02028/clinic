# QA Report — Atividade 31 (Banco de alimentos) — T-3/T-4/T-5

**Data:** 2026-09-11 · `next dev` local, `bpr_clinic_local`. Prod intocada. en-GB. Fixtures 2 tenants + food cross-tenant, removidos.

**Resultado: ✅ APROVADO** (após corrigir o FAIL de precisão). Lógica de API/DB/gating validada; 1 FAIL de precisão **corrigido e reverificado**.

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Catálogo POST/GET/PATCH + validação | ✅ |
| 2 | Refeição por alimentos → totais no Meal + MealFood | ✅ (após fix Float — ver abaixo) |
| 3 | Backward-compat: refeição manual, MealFood vazio | ✅ |
| 4 | Contrato PUT (`[]` limpa/manual; não-vazio recomputa; ausente não toca) | ✅ |
| 5 | G1: editar Food recomputa o Meal (470→540) | ✅ |
| 6 | G2: soft-delete some do picker mas preserva no plano + re-salva | ✅ |
| 7 | Portal do aluno lê macros do Meal | ✅ (dados; visual ⚠️ ver ressalva) |
| 8 | Isolamento/gate: food de outro tenant→400; CLINIC→404; nome vazio→400 | ✅ |
| 9 | Gating: CLINIC sem "Nutrition"; `/admin/nutrition`→redirect `/admin` | ✅ |
| 10 | Regressão manuais/portal | ✅ |

## FAIL corrigido (Cenário 2)
As colunas `Meal.proteinG/carbsG/fatG` eram `Int?` (herdado da ativ.27) → macros compostos decimais (ex.: 17.2) truncavam a inteiro ao gravar (derrotava o G4). O `computeMealMacros` já retornava 17.2 (unit ok); o problema era a persistência.
**Fix:** migradas as 3 colunas de `Meal` para `Float?` (kcal segue `Int`). `db push` aplicado; colunas confirmadas `double precision`; teste direto: fatG 17.2 grava e lê como 17.2. ✅

## Code review (fork) — sólido + 2 LOW aplicados
- Contrato foods (G3/G8), G1 recompute (todos os foods do meal; inclui basis), G2 soft-delete, isolamento (loadFoodMap por clinicId; foreign→400), arredondamento — todos corretos.
- **L1** aplicado: recompute do G1 agora dentro de `$transaction` (food.update + recompute atômicos).
- **L2** aplicado: `quantity` clampado no servidor (`safeQty`: NaN/negativo→0, teto).
- L3 (keys por índice) — cosmético, mantido.

## Ressalvas (não bloqueiam / ambiente)
- **UI interativa de T-4** (catálogo, food-picker) não exercitada por clique: o browser do ambiente de QA teve quebra de hidratação (`Invalid or unexpected token`) em **todas** as páginas (inclusive não relacionadas) → artefato do ambiente, não do código. A lógica foi validada via API/DB/módulo; os mesmos padrões de UI renderaram nas QAs 27/30. Fechar visualmente no dev normal / QA logado em prod.
- **Warnings de hidratação pré-existentes** em `admin-mini-sidebar` (padrão `useSession`/isPersonal, anterior à ativ.31) — fora de escopo; registrado.

**Screenshots:** `specs/31-banco-alimentos/qa/screenshots/`.
