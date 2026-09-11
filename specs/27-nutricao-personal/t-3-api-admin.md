# T-3: API admin (meal-plans)

**Status:** concluído
**Depende de:** T-1, T-2

## Objetivo
Endpoints do personal para CRUD de planos alimentares, tenant + aluno scoped, com refeições aninhadas — espelhando `/api/admin/workouts` e `/api/admin/assessments`.

## Contexto
Fluxo: `getActor` → `assertNutritionAccess(actor)` (→ clinicId) → `assertPatientAccess(actor, studentId)` (aluno pertence ao tenant, senão 404) → `validateMealPlan` → create/update. Reads via `where: { ...tenantWhere(actor), studentId }`. Erros via `accessErrorResponse`.

## Passos
1. `app/api/admin/meal-plans/route.ts`:
   - `GET ?studentId=` → lista planos do aluno **com meals E os logs de aderência** (note/photoUrl/performedAt/loggedDate) — o personal precisa VER o que o aluno registrou (G2), não só a contagem.
   - `POST` → cria plano: `data: { clinicId, studentId, trainerId: actor.userId, ...metas, meals: { create: meals.map(mapMeal) } }`. **Um ACTIVE por aluno (G4):** se `status=ACTIVE`, pausar (`PAUSED`) os outros planos ACTIVE do mesmo aluno na mesma transação. **Notificar aluno (G3):** aceitar `notifyStudent?: boolean`; se true, disparar o trigger de notificação existente ("novo plano alimentar").
2. `app/api/admin/meal-plans/[id]/route.ts`:
   - `GET` (um plano, scoped, com meals+logs), `PUT`, `DELETE`.
   - **PUT não recria meals (G1):** upsert por id — `update` das refeições existentes, `create` das novas, `delete` só das removidas — preservando os `mealId` dos logs. Atualiza metas/status. Se mudar para ACTIVE, aplica a regra "um ACTIVE por aluno". `notifyStudent?` opcional ("plano atualizado").
   - `assertRecordAccess` para garantir que o plano é do tenant.
3. **PATCH de status** (ou via PUT): mudar `status` (Activate/Pause/Archive/Complete) — G5.
4. Validação 400 em entrada inválida; 401 sem sessão; 404 aluno/plano fora do tenant.

## Arquivos afetados
- `app/api/admin/meal-plans/route.ts` (novo)
- `app/api/admin/meal-plans/[id]/route.ts` (novo)

## Critérios de aceite
- [ ] POST cria plano com refeições; retorna o objeto criado.
- [ ] GET lista só planos do aluno do tenant do ator, **incluindo os logs** (note/photo/data).
- [ ] PUT atualiza metas e refeições **por upsert (preserva mealId dos logs)**; editar um plano com logs NÃO apaga o histórico de aderência.
- [ ] Ativar/criar um plano ACTIVE pausa os demais ACTIVE do mesmo aluno (um ativo por vez).
- [ ] `notifyStudent=true` dispara notificação ao aluno; DELETE remove (cascade nas meals; logs viram `mealId=null` mas mantêm snapshot).
- [ ] Ator de outro tenant / aluno de outro tenant → 404; sem sessão → 401; payload inválido → 400.
- [ ] Rotas ficam bloqueadas para tenant CLINIC (gate de training).
