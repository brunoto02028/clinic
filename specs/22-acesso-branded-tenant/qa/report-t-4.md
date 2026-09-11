# QA T-4 (a–d) — Student Portal: separação completa do aluno personal

**Data:** 2026-09-11
**Ambiente:** dev local :4219 (build limpo), fixtures 2 tenants. Prod não tocada.
**Resultado:** ✅ **APROVADO**

## Aluno do personal (`qa.aluno@example.test`, tenant `qa-studio-pt`)
- **Nav (T-4a):** Home · **Sessions** (era Appointments) · Exercises · Learn · Messages · Plans & Membership · Terms & Consent · How It Works · My Profile. **Sem** "My Health" e **sem** "Assessment Screening". Vocabulário revocabulado (Appointments→Sessions).
- **Rotas clínicas (T-4b):** `/dashboard/clinical-notes` e `/dashboard/screening` → **redirect para `/dashboard`** (bloqueadas no middleware, redirect por role para o portal do aluno).
- **Branding (T-4c):** logo/cor do estúdio via token (`clinicLogoUrl`/`clinicPrimaryColor` na sessão); fixture sem logo → cai no logo da plataforma (esperado). Barra ativa usa a cor do tenant.
- **Home/onboarding (T-4d):** wizard "Welcome to **QA Studio PT**!", "Almost ready to start your **training**", passos: Complete Your Profile · Terms & Consent · **Book Your First Session** (passo clínico de screening **removido**); descrições revocabuladas ("reach you about **sessions**… during **workout**"). **Sem** o CTA "Complete Your Medical Screening".

## Regressão — paciente da clínica (`qa.pacientea@example.test`)
Inalterado: nav com **Appointments** + **My Health** + **Assessment Screening**; wizard "Welcome to **BPR**", "start your **treatment**", passo Assessment Screening + "Book Your First Appointment"; CTA "Complete Your Medical Screening" presente. Rotas clínicas **não** bloqueadas (correto — só o tenant personal é gated).

## Arquivos
- `lib/patient-sections.ts` (flag `clinicalOnly`), `components/dashboard/patient-sidebar.tsx` (filtro + relabel + branding), `lib/personal-blocked-routes.ts` (+`PERSONAL_BLOCKED_PATIENT_ROUTES`/`isPersonalBlockedPatientRoute`), `middleware.ts` (redirect por role), `components/dashboard/onboarding-wizard.tsx` + `patient-dashboard.tsx` (T-4d), `lib/auth-credentials.ts` + `lib/auth-options.ts` (branding no token).

## tsc
- Sem erros novos.

## Pendências menores (não bloqueantes)
- Subtítulo do hero ("track your **rehabilitation** progress") não revocabula "rehabilitation" — lacuna do mapa de vocabulário; cosmético. Pode entrar no mapa `tenant-vocab` depois.

**Conclusão: APROVADO.**
