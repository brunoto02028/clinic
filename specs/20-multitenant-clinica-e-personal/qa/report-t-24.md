# QA T-24 — Progresso e aderência para o personal (web)

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-24 (Progresso e aderência)
**Data:** 2026-09-10
**Ambiente:** LOCAL — http://localhost:4201 (banco `bpr_clinic_local`, `OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado geral:** ✅ **APROVADO** (UI 3/3 + backend runtime 39/39)

## Resumo (UI)
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Painel "Progress" aparece na aba Workouts, acima do builder | UI | ✅ |
| 2 | Conteúdo: aderência, volume semanal, evolução de carga, sessões recentes | UI | ✅ |
| 3 | `GET /api/admin/workouts/progress?studentId=…` → 200 | Rede | ✅ |

## Evidência
- Aderência: **2/12 sessions · 17%** (2 feitas; 12 previstas em 4 semanas).
- Volume semanal: barras `W36=800`, `W37=808`.
- Evolução de carga: `QA Goblet Squat` ↗ **40→42.5 kg** (seta de alta).
- Últimas sessões: `10/09/2026 · 2 sets · 808 · RPE 8` e `03/09/2026 · 2 sets · 800 · RPE 7`.
- Console: 0 erros/warnings. Screenshots: `qa/screenshots/t-24-progress-panel.png`, `t-24-workouts-progress-full.png`.

## Backend (automatizado)
Suíte runtime **39/39**, novos:
- **P1** trainer lê o progresso do aluno (reflete as 2 sessões: `doneLast4Weeks=2`).
- **P2** clínica (TRAINING off) → progresso 404.
- **P3** trainer pedindo aluno de outro tenant → 404.

## Respostas ao code review (5 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | Volume contava séries `completed:false` (séries são pré-preenchidas → inflava) | ✅ volume/setCount/carga agora contam **só séries completadas** (`doneSets`). |
| 3 | `loadByExercise` chaveado por NOME + mapa só de treinos ativos (colisões / "Exercise") | ✅ chaveado por `workoutExerciseId`; nome via query de `WorkoutExercise` pelos ids dos logs (cobre treinos inativos). |
| 4 | Componente não resetava ao trocar de aluno (dados do anterior persistiam) | ✅ `setLoading(true)`/`setData(null)` no início do effect. |
| 5 | Guarda do P1 (`if(workoutId)`) mais fraca que a que registrou as sessões (`&& weId`) | ✅ P1 agora sob `if (workoutId && weId)`. |
| 2 | Aderência pode passar de 100% após troca de programa (num. conta logs de treino inativo) | ⚠️ **aceito** — métrica "sessões feitas nas 4 semanas × previstas/semana atuais"; div-by-zero já guardado (adhPct null). Informativo, não defeito. |

Verificado: `tsc` limpo + runtime **39/39** mantido após os fixes.

## Critérios de aceite
- [x] Cenários da T-24 passando.

**Conclusão: APROVADO.**
