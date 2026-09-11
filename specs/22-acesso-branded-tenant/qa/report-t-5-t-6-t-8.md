# QA T-8 + T-5 + T-6 — nav Workouts, links do estúdio, guards

**Data:** 2026-09-11
**Ambiente:** dev local :4220 (build limpo), fixtures 2 tenants. Prod não tocada.
**Resultado:** ✅ **APROVADO**

## T-8 — item "Workouts" na nav do aluno personal
- **Aluno** (`qa.aluno`, personal): nav mostra **"Workouts" → `/dashboard/workouts`** (logo após Home). A tela abre (título "My Workouts"), estado vazio correto ("No workouts assigned yet. Your trainer will set these up").
- **Regressão clínica** (`qa.pacientea`): **sem** "Workouts" na nav; mantém Appointments/My Health/Assessment Screening.
- Implementação: `PatientSection.personalOnly` + seção "workouts" (`lib/patient-sections.ts`); filtro no `patient-sidebar` (`isPersonal ? esconde clínicas : esconde personalOnly`).

## T-5 — links do estúdio no admin
- **Trainer** (`qa.trainer`): `/admin` mostra o card **"Your studio links"** com **Student login** (`/studio/qa-studio-pt`) e **Invite (sign-up)** (`/join/qa-studio-pt`), ambos com botão Copiar.
- **Regressão clínica** (`qa.admina`): **não** vê o card (componente retorna null p/ `clinicType !== PERSONAL_TRAINER`).
- Implementação: `components/admin/studio-links-card.tsx` (usa `session.clinicType`/`clinicSlug`), montado no topo de `app/admin/page.tsx`.

## T-6 — guards / regressão
- `/studio/qa-studio-pt` público (200) sem login; `/studio/qa-clinic-a` e slug inexistente → 404 (T-1). Personal gate não bloqueia `/studio` (rota pública → middleware retorna antes) nem `/join`.
- `/login` e `/staff-login` **inalterados** (genéricos): staff-login → `/admin` (staff), `/login` autenticou paciente — usados repetidamente neste QA sem mudança de comportamento.
- Sem código novo em T-6 além da rota pública `/studio` já adicionada na T-1.

## tsc
- Sem erros novos.

**Conclusão: APROVADO.**
