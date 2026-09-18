# QA T-1/T-2/T-3 — Limpeza do admin do personal

**Data:** 2026-09-11 · dev local :4226 · fixtures 2 tenants. Prod não tocada.
**Resultado:** ✅ APROVADO

## Trainer (qa.trainer, personal)
- **T-1:** `/admin/patients` sem aba "Screening/Readiness" (só List/Tasks/Portal + abas da ficha). (Flash de hidratação some ao `isPersonal` resolver.)
- **T-2:** `/admin` sem cards "Articles"/"New Article"/"Training Notes→clinical-notes" (0 refs).
- **T-3:** ficha diz **"Student Invite Link"**, **"View as Student"**, "…so the **student** can complete…".

## Regressão (qa.admina, clínica)
- Dashboard mantém Articles + clinical-notes (5 refs); nav mantém Clinical/Marketing/Patients. Screening e vocab "Patient" preservados.

## tsc
- Sem erros novos.

**Conclusão: APROVADO.**
