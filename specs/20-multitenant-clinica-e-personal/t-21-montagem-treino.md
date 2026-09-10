# T-21: Montagem de treino pelo personal (web)

**Status:** concluído
**Trilha:** PERSONAL
**Depende de:** T-20

> QA aprovado (qa/report-t-21.md — 5/5 Playwright) + code review feito (6/7 achados corrigidos, 1 aceito).
> Aba "Workouts" em `app/admin/patients/[id]/page.tsx` (gated por isPersonal) → `components/workouts/workout-builder.tsx`.
> Fora do escopo (sinalizado): abas clínicas ainda visíveis ao personal na ficha (gating de nav, T-19b estendida).

## Objetivo
O personal monta e ajusta os treinos do aluno pela web.

## Passos
1. Aba "Treinos" na ficha do aluno, visível só no tenant personal:
   - lista A/B/C;
   - criar a partir da biblioteca (busca e vídeo);
   - reordenar e agrupar em superset;
   - séries, reps, carga, RPE/RIR, cadência, descanso.
2. Duplicar treino e ajustar a semana/progressão (ex.: +2,5 kg ou +1 rep).
3. Resolver a falta de um botão claro de "nova prescrição" (PT-2 da atividade 19) no fluxo do personal.

## Critérios de aceite
- [x] Cenários da T-21 passando.
- [x] Regressão: a ficha do paciente da BPR fica sem a aba.
