# QA T-4 — Área do aluno na web (/dashboard/assessments)

**Data:** 2026-09-10
**Ambiente:** local :4209 (banco `bpr_clinic_local`). Produção não tocada.
**Resultado:** ✅ **APROVADO** (2/2)

## Evidências (Playwright)
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Aluno vê "My Assessments": Evolution (Weight 84→80 kg, Body fat 24→20 %, Waist 90→82 cm) + 2 cards de histórico datados (BMI/%GC/lean/WHR corretos) | ✅ |
| 2 | Paciente da clínica → estado vazio, **sem banner de erro** (GET /api/assessments 404 tratado) | ✅ |

Screenshots: `qa/screenshots/t-4-aluno-my-assessments.png`, `t-4-paciente-clinica-vazio.png`.

## Respostas ao code review (6 achados)
| # | Achado | Disposição |
|---|--------|-----------|
| 1 | catch-all mascarava 401/500 como "vazio" | ✅ só 404 → indisponível; outros erros → banner de erro. |
| 4 | Copy do vazio enganoso p/ 404 (módulo off) | ✅ copy neutro "Assessments aren't available on your plan." quando indisponível. |
| 2 | `a.photos` sem guarda | ✅ `(a.photos ?? [])`. |
| 3 | Body 200 pode não ser array | ✅ `Array.isArray(data) ? data : []`. |
| 5 | Ícone e cor da tendência duplicavam a direção | ✅ `trendDir` único → ícone + cor. |
| 6 | setState após await sem guarda de unmount | ✅ flag `live`. |

Verificado: tsc limpo + QA 2/2. (Fotos não apareceram no QA porque a fixture não tinha imagem — esperado; o backend de fotos já foi verificado na T-2/T-3.)

## Critérios de aceite
- [x] Aluno vê só as próprias; paciente de clínica → estado vazio sem erro.

**Conclusão: APROVADO.**
