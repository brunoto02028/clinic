# T-24: Progresso e aderência para o personal

**Status:** concluído
**Trilha:** PERSONAL
**Depende de:** T-22

> QA aprovado (qa/report-t-24.md — 3/3 UI + runtime 39/39) + review feito (5 achados: 4 corrigidos, 1 aceito).
> `GET /api/admin/workouts/progress` + `components/workouts/workout-progress.tsx` (painel no topo da aba Workouts).

## Objetivo
O personal acompanha a evolução do aluno.

## Passos
1. Na ficha do aluno:
   - aderência (sessões feitas × previstas);
   - volume semanal;
   - evolução de carga por exercício;
   - últimos registros com RPE.
2. Reusar os componentes de gráfico da atividade 13, quando couber.

## Critérios de aceite
- [x] Cenários da T-24 passando.
