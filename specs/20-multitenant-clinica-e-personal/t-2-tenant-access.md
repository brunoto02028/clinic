# T-2: `lib/tenant-access.ts` + testes + fixtures de 2 tenants

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-1

## Objetivo
Criar o ponto único de controle de acesso por tenant, que falha fechado, e os fixtures reutilizáveis de QA.

## Contexto
- D2, D3 e D4 do plano.
- O padrão correto já existe em `app/api/foot-scans/[id]/route.ts:48-52`: paciente só o próprio; staff só no mesmo tenant.

## Passos
1. `lib/tenant-access.ts`:
   - `getActor(request)`: sessão web ou Bearer do app; devolve `userId`, `role`, `clinicId`, respeitando a impersonação.
   - Para SUPERADMIN, o tenant é o selecionado (cookie) ou o tenant padrão.
   - `assertClinicAccess(actor, clinicId)`, `assertPatientAccess(actor, patientId)` e `tenantWhere(actor)`.
   - Registro de outro tenant → **404**; papel errado → 403. Sem tenant resolvido → nega.
2. Testes Jest em `__tests__/tenant/`: cada papel × mesmo tenant, outro tenant e `clinicId` nulo.
3. `scripts/qa/tenant-fixtures.cjs` e `scripts/qa/tenant-cleanup.cjs`:
   - idempotentes;
   - abortam se o banco não for local;
   - criam o tenant A (clínica) e o B (personal) com profissional, paciente ou aluno, exercício, avaliação e agendamento.
4. Nenhuma rota é alterada nesta tarefa.

## Arquivos afetados
- `lib/tenant-access.ts` (novo)
- `__tests__/tenant/tenant-access.test.ts` (novo)
- `scripts/qa/tenant-fixtures.cjs`, `scripts/qa/tenant-cleanup.cjs` (novos)

## Critérios de aceite
- [ ] `npx jest __tests__/tenant` verde.
- [ ] Fixtures 2× + limpeza sem sobras.
