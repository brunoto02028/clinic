# T-12: `Clinic.type` + tenant padrão explícito; fim dos `findFirst`

**Status:** base concluída (tipo + threading); limpeza ampla de findFirst incremental
**Trilha:** PLATAFORMA
**Depende de:** T-6

## Objetivo
Dar tipo ao tenant (clínica × personal) e acabar com "a primeira clínica do banco" como regra de atribuição (achado A2).

## Passos
1. Enum `TenantType { CLINIC, PERSONAL_TRAINER }` e `Clinic.type @default(CLINIC)`, com migração aditiva.
2. `lib/default-tenant.ts`:
   - resolve o tenant padrão por `DEFAULT_CLINIC_SLUG`;
   - sem a variável, vale só se existir exatamente uma clínica; do contrário, dá erro explícito.
3. Trocar os fallbacks (`findFirst`, `getDefaultClinic`, `resolveClinicId`) por `default-tenant` ou `tenant-access`. São 53 usos: signup, Google, public schedule, exercise-folders, analytics, foot-scans, vapi, treatment-plans etc.
4. Helper `isPersonalTenant(clinic)` para as telas e rotas da trilha PERSONAL.

## Critérios de aceite
- [ ] Cenários da T-12 passando.
- [ ] Regressão: o cadastro de paciente na BPR fica igual.

## Achado registrado durante a T-5
- `/api/admin/availability` (PUT) grava `SLOT_INTERVAL_MINUTES` na `SystemConfig`, que é **global**: o admin de qualquer tenant muda o intervalo de agendamento de todos. Esse valor precisa virar configuração por tenant. A leitura em `/api/availability` e `/api/admin/availability` segue global até lá.

## Entregue (base)
- Enum `TenantType { CLINIC, PERSONAL_TRAINER }` + `Clinic.type @default(CLINIC)`, migração aditiva idempotente aplicada no local (`prisma db execute` + `generate`). As clínicas atuais ficaram `CLINIC`.
- `lib/tenant-type.ts` com `isPersonalTenant(type)`.
- `clinicType` propagado por `auth-credentials`, `mobile-tokens`, `dual-auth` e `auth-options` → disponível em `session.user.clinicType` (web) e no token do app.

## Pendente (incremental, não bloqueia)
- Limpeza ampla dos 53 `findFirst`/`getDefaultClinic`/`resolveClinicId` → `default-tenant`/`tenant-access`. O resolvedor `default-tenant.ts` (T-2) e os fallbacks de signup/Google já estão corretos; o resto é higiene por rota.
- Em prod: rodar a mesma migração aditiva de `Clinic.type` no push.
