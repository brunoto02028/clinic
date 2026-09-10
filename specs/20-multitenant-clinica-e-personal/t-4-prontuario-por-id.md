# T-4: Prontuário por ID

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-2

## Objetivo
Fechar C2, C3 e C5: staff de um tenant lê, edita e apaga prontuário, notas SOAP e usuários de outro tenant. Confirmado nos ISO-1, ISO-8b e ISO-9.

## Passos
1. Aplicar `assertPatientAccess` em:
   - `app/api/admin/patients/[id]/route.ts` (GET, PATCH — inclusive o delete de nota SOAP e as edições de triagem e foot scan);
   - as sub-rotas `messages`, `questions`, `invite`, `atlas-chat`, `documents/generate`, `protocol-revise`, `protocol`, `packages/checkout`.
2. `app/api/patients/[id]/route.ts` (GET, PATCH, DELETE): o DELETE passa a apagar só `role = PATIENT` do mesmo tenant.
3. `app/api/soap-notes/[id]/route.ts` e `[id]/pdf`: staff só do mesmo tenant; paciente só a própria.
4. `app/api/admin/screening/[id]` e `app/api/admin/users/[id]`.

## Critérios de aceite
- [ ] Cenários da T-4 passando.
- [ ] Regressão: a ficha completa de paciente da BPR continua igual para o SUPERADMIN.
