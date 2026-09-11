# T-6: Gating + vocab + guardas + regressão

**Status:** concluído
**Depende de:** T-4, T-5

## Objetivo
Challenges 100% personal-only; clínica (incl. Journey clínico) intocada; sem vazamento.

## Passos
1. Toda superfície gated: seção admin (`personalOnly`), página `/admin/challenges` (gate na API), portal (`personalOnly`), página `/dashboard/challenges` (guarda server-side redirect não-personal), APIs (`assertTrainingAccess`/`assertStudentTrainingAccess`).
2. Confirmar que o novo flag `personalOnly` em `admin-sections.ts` não afeta a nav da clínica (regressão): clínica vê as mesmas seções de antes.
3. Vocab por relabel; inglês UK; nada clínico nos textos de challenge.
4. Regressão: a stack Journey clínica (PatientProgress/WeeklyChallenge/achievements/quizzes) e os logs (WorkoutLog/MealLog) intactos; nada nas queries de challenge escreve em modelos clínicos.

## Critérios de aceite
- [ ] Tenant CLINIC: nenhuma superfície de Challenges (admin nem portal); nav clínica inalterada.
- [ ] Tenant PERSONAL: Challenges presente e funcional.
- [ ] Paciente clínico redirecionado de `/dashboard/challenges`.
- [ ] Sem regressão no Journey clínico nem nos logs.
