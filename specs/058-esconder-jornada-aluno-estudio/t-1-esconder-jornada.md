# T-1: Jornada fora do menu, da URL e da Comunidade vazia para o aluno de estúdio

**Status:** concluído
**Depende de:** nenhuma

## Passos
1. `components/dashboard/patient-sidebar.tsx`: acrescentar `"mod_journey"` a `CLINICAL_PATIENT_KEYS`.
2. `lib/personal-blocked-routes.ts`: acrescentar `"/dashboard/journey"` e `"/dashboard/quiz"` a `PERSONAL_BLOCKED_PATIENT_ROUTES`.
3. `app/dashboard/community/page.tsx`: esconder o botão "Start your journey" / "Comece sua jornada" para estúdio.

## Critérios de aceite
- [ ] `qa.aluno`: sem "Journey" no menu, em desktop e em 390 px. `/dashboard/journey` e `/dashboard/quiz` redirecionam para `/dashboard`. `/dashboard/quizzes` e `/dashboard/community` continuam abrindo, e a Comunidade vazia não tem o botão da jornada.
- [ ] `qa.pacientea` (clínica): "BPR Journey" no menu (quando liberado), `/dashboard/journey` e `/dashboard/quiz` abrem, e o botão da Comunidade continua.
- [ ] `qa.trainer`: `/admin/journey` continua abrindo.
