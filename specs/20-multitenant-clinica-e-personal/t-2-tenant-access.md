# T-2: `lib/tenant-access.ts` + testes + fixtures de 2 tenants

**Status:** concluído
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
- `lib/default-tenant.ts` (novo — resolve o tenant padrão por `DEFAULT_CLINIC_SLUG`; a T-12 reaproveita para eliminar os `findFirst`)
- `__tests__/tenant/tenant-access.test.ts` (novo)
- `scripts/qa/tenant-fixtures.cjs`, `scripts/qa/tenant-cleanup.cjs` (novos)

## Critérios de aceite
- [x] `npx jest __tests__/tenant` verde.
- [x] Fixtures 2× + limpeza sem sobras.

## Registro
- **QA:** `qa/report-t-2.md` — aprovado (U1, U2, S1–S5). Observação O3 atendida com testes de SUPERADMIN e de registro sem paciente. A O1 (sem tenant padrão com várias clínicas) fica anotada para o push.
- **Code review (`/code-review high`):** nenhum bug em `tenant-access`/`default-tenant`. Dois achados de severidade baixa, corrigidos:
  1. A allowlist não servia para e-mail de template, porque todo template leva o admin em BCC. Agora o destinatário principal precisa estar todo na lista, e as cópias fora dela são removidas e registradas. Em produção nada muda. É um ajuste da T-1, em commit próprio.
  2. As fixtures reaproveitavam o agendamento com a data da primeira execução. Agora a data é atualizada a cada rodada e o ID se mantém.
- **Verificação pós-correção:** 122/122 testes; `tsc` sem erro; fixtures 2× com IDs idênticos e agendamentos no futuro; limpeza com 0 sobras.
