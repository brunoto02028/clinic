# QA Report — T-3: API admin de meal-plans

**Data:** 2026-09-11 · **Tipo:** API (HTTP real via NextAuth) · **Ambiente:** `next dev` local, banco `bpr_clinic_local` (prod intocada). Fixtures 2 tenants (PERSONAL_TRAINER + CLINIC), removidas ao final.

**Resultado: ✅ APROVADO** (10/11 PASS; a divergência não é defeito do T-3).

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | POST cria plano (3 meals + metas) → 201; GET ?studentId lista com meals **e** logs | ✅ |
| 2 | Editar-preserva-logs (G1): meal id estável, MealLog intacto após PUT | ✅ |
| 3 | Um-ativo (G4): 2º ACTIVE pausa o 1º | ✅ |
| 4 | Status via PUT: PAUSED e ARCHIVED | ✅ |
| 5 | DELETE remove plano + meals (cascade); GET depois → 404 | ✅ |
| 6 | Inválidos: sem name / meals:[] / macro negativo → 400 | ✅ |
| 7b | POST com studentId de OUTRO tenant → 404 | ✅ |
| 7c | GET/PUT/DELETE de plano de OUTRO tenant → 404 (plano intacto) | ✅ |
| 8 | Gating: admin de tenant CLINIC → 404 (POST e GET) | ✅ |
| 7a | Sem sessão → 307 redirect /login (esperado 401) | ⚠️ ver nota |

**G1 (crítico) confirmado no banco:** após PUT editando a descrição de um meal (enviando seu `id`), o meal manteve o mesmo id e o `MealLog.mealId` continuou apontando para ele — histórico de aderência preservado. Upsert por id funcionando.

**Nota 7a:** sem sessão, `/api/admin/*` responde 307→/login pelo `middleware.ts` (linhas 277-282), antes da rota — comportamento global (workouts/assessments/patients respondem igual). O `return 401` do `getActor` é defesa-em-profundidade atrás do middleware. Segurança cumprida (request não-autenticado negado, sem vazar dados); 401 literal seria mudança transversal no middleware, fora de escopo.

**Console/servidor:** sem erros/500 durante os testes.
