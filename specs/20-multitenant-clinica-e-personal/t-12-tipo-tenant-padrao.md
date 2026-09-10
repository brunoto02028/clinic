# T-12: `Clinic.type` + tenant padrão explícito; fim dos `findFirst`

**Status:** pendente
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
