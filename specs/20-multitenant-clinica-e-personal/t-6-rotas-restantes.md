# T-6: Triagem e correção das demais rotas de staff

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-3, T-4, T-5

## Objetivo
Cobrir o restante da varredura da atividade 19 (A3): as rotas de staff que não referenciam tenant.

## Passos
1. Registrar em `qa/triagem-rotas.md` a classificação de cada rota. São três classes:
   - **tenant:** passa a usar o helper;
   - **plataforma:** fica só para SUPERADMIN — `clinics`, `system-logs`, `agent-keys`, `email-config`, `maintenance` etc.;
   - **usuário:** o escopo por `userId` já basta.
2. Corrigir as rotas de tenant. Grupos: clinical-scribe, education content, image-library, upload, patient-packages/service-packages, dashboard/stats, payments create-checkout/verify, agent/patients e leads, broadcasts, consent-texts, screening-config, service-pages, stripe-branding, exercises/backfill e normalize.
3. `withClinicFilter` e `resolveClinicId` passam a falhar fechado, delegando ao `tenant-access`.

## Critérios de aceite
- [ ] Toda rota da varredura aparece classificada em `triagem-rotas.md`.
- [ ] Cenários da T-6 passando.
- [ ] Regressão: as telas do admin da BPR abrem sem erro.
