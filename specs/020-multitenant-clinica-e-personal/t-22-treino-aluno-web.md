# T-22: Treino do aluno + registro de séries (web)

**Status:** concluído
**Trilha:** PERSONAL
**Depende de:** T-21

> QA aprovado (qa/report-t-22.md — 5/5 UI + runtime 31/31) + code review feito (6/6 achados corrigidos).
> `/dashboard/workouts` (portal do aluno, paleta da marca) → `components/workouts/student-workouts.tsx`; API `/api/workouts` + `/api/workouts/[id]/logs`.

## Objetivo
O aluno vê o treino do dia com vídeo e registra o que fez.

## Passos
1. `/dashboard/workouts`:
   - treinos do aluno e o do dia;
   - execução com vídeo por exercício;
   - carga, reps e RPE por série, pré-preenchidos com o prescrito;
   - timer de descanso.
2. Histórico das sessões registradas.

## Critérios de aceite
- [x] Cenários da T-22 passando.
