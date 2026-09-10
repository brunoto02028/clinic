# T-19a — Gating de módulos por tipo de tenant

**Data:** 2026-09-10
**Status:** ✅ navegação gated (parte da T-19). Onboarding/questionário e gating server-side ficam como T-19b.

## O que foi feito
- `AdminSection`/`AdminTab` ganharam `clinicalOnly?`. Marcados: **SOAP Notes**, **Protocols**, **Rehab Agent**.
- `visibleAdminSections(isPersonal)` remove tabs/seções `clinicalOnly` para o tenant personal (e some com a seção se ela ficar sem tabs). Aplicado no `admin-mini-sidebar` e no `section-tabs`.
- Teste de unidade `__tests__/tenant/admin-sections-gating.test.ts` (3 casos).

## Evidência
`screenshots/t-19-personal-training-tabs.png` — tenant `qa-studio-pt` (PERSONAL_TRAINER): a seção **Training** mostra só **Workouts, Exercises, Equipment**; SOAP Notes, Protocols e Rehab Agent não aparecem. Numa clínica todas as tabs continuam.

## Pendente (T-19b)
- **Gating server-side:** hoje escondo da navegação; um admin personal ainda alcançaria `/admin/clinical-notes` etc. pela URL. Bloquear essas páginas por tipo de tenant (redirect/404) é defesa em profundidade.
- **Onboarding do personal:** questionário de prontidão (autoral, bilíngue, revisado pelo painel), 4 passos, e catálogo de serviços do tenant no diálogo de nova sessão. Acoplado à T-13 (entrada do aluno).
