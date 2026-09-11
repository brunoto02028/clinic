# QA Report — T-6: Mobile (API server-side)

**Data:** 2026-09-11 · **Escopo:** API mobile de nutrição (curl + Bearer). App Expo/tela RN NÃO testados (build EAS fica para o lote de release mobile, conforme o T-6). · **Ambiente:** `next dev` local, banco `bpr_clinic_local`. Prod intocada. Fixtures 2 tenants, removidas ao final.

**Resultado: ✅ APROVADO — 8/8 cenários.** Nenhum 500.

| # | Cenário | Obtido | Resultado |
|---|---------|--------|-----------|
| 1 | GET /api/mobile/modules (aluno personal) contém `nutricao` | 200 + treino/avaliacoes/nutricao | ✅ |
| 2 | GET /api/mobile/modules (paciente CLINIC) sem `nutricao` | 200 (lab/clinica/ba) | ✅ |
| 3 | GET /api/mobile/meal-plans (aluno) → plano ACTIVE + meals + logs | 200 correto | ✅ |
| 4 | POST /logs cria + idempotente (mesmo POST → mesmo id, count=1) | 201/201 sem duplicar | ✅ |
| 5 | DELETE /logs remove | 200, count=0 | ✅ |
| 6 | POST /logs mealId fora do plano | 400 "Meal not found in this plan" | ✅ |
| 7 | Sem/invalid Bearer | 401 direto (JSON, sem redirect) | ✅ |
| 8 | Aluno acessa plano de OUTRO aluno (POST/DELETE) | 404 | ✅ |

**Gating mobile (T-7):** módulo `nutricao` só no tenant personal (cenário 2 confirma clínica não recebe). **Isolamento:** `assertMealPlanForStudent` bloqueia cross-student (404). **Idempotência:** unique `(student, meal, loggedDate)` confirmado.

**Nota:** a rota mobile `/logs` implementa POST/DELETE (sem GET — GET→405, intencional; o app lê logs pelo GET de `/meal-plans`). O controle de acesso foi validado via POST/DELETE.

**Pendente (fora de escopo, não é falha):** tela `nutricao.tsx` em Expo dev + build EAS — lote de release mobile.
