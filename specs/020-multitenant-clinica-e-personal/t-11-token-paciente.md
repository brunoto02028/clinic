# T-11: Token de paciente sem flags de staff

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** nenhuma

## Objetivo
O token de paciente (web e app) carrega `canViewAllPatients: true` e `canCreateClinicalNotes: true`, que são padrões do `User` (AL-4 da atividade 19). Hoje o `requirePermission` barra o paciente antes de ler essas flags, mas isso não pode depender de sorte.

## Passos
1. Na montagem do token (`lib/auth-options.ts`, `lib/auth-credentials.ts`, `lib/mobile-tokens.ts` e o registro mobile): permissões só para staff; para paciente, vazio ou `false`.

## Critérios de aceite
- [ ] Login de paciente (web e app) sem flags de staff.
- [ ] Login de staff com as flags inalteradas.
