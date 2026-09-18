# T-1: Um helper só para a clínica da sessão

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Uma única função resolve a clínica de trabalho a partir da sessão, com a mesma regra do
`getActor`, e o helper legado deixa de existir.

## Passos
1. `lib/session-clinic.ts` (novo): `sessionClinicId(session)` → `resolveActorTenant(role, ownClinicId, cookie)`,
   buscando a clínica do usuário no banco quando a sessão não a traz; cookie só é lido para
   SUPERADMIN e dentro de try/catch (fora de requisição, `cookies()` lança).
2. `lib/exercise-folders.ts`: `resolveClinicId` passa a reexportar `sessionClinicId`.
3. `lib/resolve-clinic-id.ts`: apagado depois que as 18 rotas migrarem (T-2/T-3).

## Critérios de aceite
- [x] ADMIN/THERAPIST: clínica da conta, mesmo com cookie de outra clínica
- [x] SUPERADMIN: clínica ativa; sem seleção, a própria
- [x] Conta sem clínica: `null` (nunca "a primeira clínica da tabela")
- [x] Nenhum arquivo importa `@/lib/resolve-clinic-id`
