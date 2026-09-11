# QA Report — T-4 (UI admin) e T-5 (portal do aluno) — Nutrição

**Data:** 2026-09-11 · **Tipo:** UI (Playwright) · **Ambiente:** `next dev` local, banco `bpr_clinic_local`. Prod/remoto intocados. Locale en-GB. Fixtures 2 tenants (PERSONAL_TRAINER + CLINIC), removidas ao final.

**Resultado: ✅ APROVADO — 14/14 cenários PASS. 0 erros e 0 warnings de console (React).**

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Aba "Nutrition" aparece (personal) | ✅ |
| 2 | Empty-state "No meal plan yet…" | ✅ |
| 3 | Criar plano (nome+metas+3 refeições), total planejado, badge ACTIVE | ✅ |
| 4 | Status Activate/Pause/Archive | ✅ |
| 5 | Editar descrição de refeição e salvar (persiste, meal.id estável) | ✅ |
| 6 | Checkbox "Notify student" no form | ✅ |
| 7 | Feed de aderência mostra logs do aluno (nome+data+nota) | ✅ |
| 8 | Excluir plano com confirmação → empty-state | ✅ |
| 9 | Regressão CLINIC: ficha sem aba "Nutrition" | ✅ |
| 10 | Sidebar do aluno mostra "Nutrition"; abre `/dashboard/nutrition` | ✅ (Nota A) |
| 11 | Plano ACTIVE: metas + refeições do dia + aderência (7d) | ✅ |
| 12 | Marcar (aderência sobe), 2x não duplica, desmarcar (desce) | ✅ |
| 13 | Empty-state "Your trainer hasn't set a meal plan yet." | ✅ |
| 14 | Regressão CLINIC: sem "Nutrition"; `/dashboard/nutrition` → redirect `/dashboard` | ✅ |

**Destaques:** total planejado de macros atualiza dinâmico no form; feed do personal mostra logs com nome+data+nota (G2); idempotência confirmada (2 POST → 1 log, aderência ≤100%, G6); regressão clínica limpa (sem aba/seção; guarda redireciona).

## Notas
- **A (não-bug):** o link "Nutrition" no sidebar do aluno inicialmente não renderizou por **cache stale do `next dev`** (chunks do dev sem content-hash); após limpar `.next`/cache, renderizou correto. Em produção (chunks com hash) não ocorre. PASS.
- **B (escopo T-3, intencional):** excluir o **plano inteiro** faz cascade e remove os MealLogs (`MealLog.mealPlanId onDelete: Cascade`). A preservação de snapshot (`mealId→null`) vale para remoção de **uma refeição** num plano vivo, não para exclusão do plano. Comportamento documentado no DELETE.
- **C (falso alarme):** o QA reportou `.env` em Railway; na verdade a linha ativa `DATABASE_URL` é `localhost` — a linha Railway está **comentada** (config morta). Prod não tocado.

## Pós-QA (fix do code review M1)
Após o QA, adicionei ao portal do aluno um **input de nota opcional** por refeição, enviado no POST de marcar (fecha o M1 do review: a nota do aluno agora é coletada na UI, não só via API). A persistência da nota já havia sido validada (feed do personal mostrou a nota). Foto de refeição → backlog. Typecheck limpo.

**Screenshots:** 15 arquivos em `specs/27-nutricao-personal/qa/screenshots/` (`t-4-01`…`t-4-08`, `t-5-01`…`t-5-07`).
