# QA Report — T-4 (Modais) & T-6 (Vocab restante)

**Data:** 2026-09-11 · **Locale:** en-GB · **Tenant:** Peak Form Studio (PERSONAL_TRAINER)
**Resultado geral:** ✅ aprovado (ressalvas corrigidas após o QA).

## Resumo

| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | `/admin/appointments` — botão + modal New Session | ✅ |
| 2 | `/admin/treatment-plans` — empty state + modal | ✅ (ver nota) |
| 3 | `/admin/patients/<id>/permissions` — Student Permissions | ✅ |
| 4 | `/admin/patients` — dropdown/badge/contador/console | ✅ |
| 5 | Assessments → New assessment → girths | ✅ |
| 6 | `<title>` da aba em `/admin/*` | ✅ |

## Detalhes verificados

- **1** Botão "New Session"; modal com "Student *", "Workout Type", "Pay at the studio", "Session Notes", "Create Session"; empty state "No sessions found".
- **2** Empty state "No workout plans yet" + "Create a plan to assign workouts to students"; modal "New Workout Plan"; escopo "Specific/All/No Student"; seção "Workouts"; placeholder "Post-Surgery Training"; catálogo "Your workout catalog is empty".
  - Nota: "No workout plans yet"/"New Workout Plan" é o relabel correto (Treatment→Workout). Vocabulário válido de personal; mantido.
- **3** Título "Student Permissions"; módulos em inglês (Dashboard, My Profile, …); categoria "Clinical" ausente; cards Screening/Treatment ausentes; "Back to Student".
- **4** Contador "2 students"; badge "No Readiness"; dropdown "Edit Student/Documents/Permissions/Delete Student"; **console 0 errors / 0 warnings** (key + nested `<a>` resolvidos).
- **5** Circumferences com "Arm (relaxed)"/"Arm (flexed)" (sem chaves cruas).
- **6** `document.title` = "Peak Form Studio · Admin" em todo `/admin/*` (sem "Bruno Physical Rehabilitation").

## Ressalvas do QA — corrigidas em seguida

1. **AI Notes** no modal New Session tinha vocab clínico não-relabelado (helper "patient, treatment") → helper agora passa por `relabel()`.
2. Relabel gerava "**an** session" (de "an appointment") → `personalizeLabel` agora corrige o artigo indefinido ("an X" → "a X") para alvos EN de consoante. Validado por teste de regex.

## Code review (fork) — 1 achado ALTA corrigido

- `patients-list.tsx`: com o wrapper externo agora sendo `div onClick={router.push}`, o gatilho do menu ⋮ (que só fazia `preventDefault`) borbulhava e navegava. **Corrigido:** trigger agora faz `preventDefault()` + `stopPropagation()`. Demais elementos internos já tinham stopPropagation.

## Fora de escopo (audit ainda aberto)
- "0 appts" na lista; sigla "BPR Journey"; "learn about your condition" em Quizzes.
- Flash pré-hidratação (~1–2s) com termos clínicos antes do relabel client-side aplicar (rotas clínicas seguem bloqueadas server-side).
- 500 em `/api/admin/stripe-branding` no local (Stripe não configurado) — não é regressão.

**Screenshots:** `specs/26-limpeza-admin-personal-completa/qa/screenshots/`
