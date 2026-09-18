# QA T-6 — 1RM (Epley) + curvas de composição no Progresso

**Data:** 2026-09-10
**Ambiente:** local :4210 (banco `bpr_clinic_local`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (runtime 60/60)

## Entregue
- `app/api/admin/workouts/progress`: adiciona **`oneRepMax`** (Epley, melhor série **completada** por exercício) e **`composition`** (curvas de `weightKg`, `bodyFatPct`, `waist` das `StudentAssessment` do aluno — mesma query tenant/aluno já escopada).
- `components/workouts/workout-progress.tsx`: novo bloco "Estimated 1RM (Epley)" por exercício + "Composition (first → latest)" (peso/gordura/cintura). Lida com campos ausentes (dados antigos).

## Evidência — runtime `npm run test:tenants` → **60/60**
- **A8**: `GET .../workouts/progress` para o aluno → `oneRepMax` não-vazio (1RM estimado da série logada) **e** `composition.weight` contém 80 (da avaliação registrada). Isolamento herdado do endpoint (P2/P3: clínica/estudante alheio → 404).

## Respostas ao code review (5 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | `take:60`+`asc` pegava os 60 mais ANTIGOS | ✅ ordena desc + take 60 + reverte (últimas 60, cronológico). |
| 2 | 1RM com key por nome duplicava (mesmo nome em 2 treinos) | ✅ agrega 1RM por NOME (max) → nomes únicos. |
| 3 | Query de avaliações serial | ✅ em `Promise.all` com os logs. |
| 5 | `v: number|null` divergia do contrato `v: number` | ✅ filtro com type-guard → `v: number`. |
| 4 | Extração de séries duplicada (route × componente do aluno) | ⚠️ aceito (3 linhas; extrair seria over-engineering). |

Verificado: tsc limpo + runtime 60/60 (A8) mantido.

## Critérios de aceite
- [x] 1RM estimado aparece por exercício; curvas de composição no progresso.

**Conclusão: APROVADO.**
