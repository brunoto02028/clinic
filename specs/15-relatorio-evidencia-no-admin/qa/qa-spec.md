# QA — Atividade 15: Relatório de evidência auto-gerado no admin

Evidências em `qa/` (screenshots do admin + outputs). Feature **tem autenticação** (staff) →
cenários de auth incluídos. Paciente de teste com triagem preenchida.

---

## T-1 — Modelo
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 1.1 | migration | `prisma migrate dev` + `generate` | Aplica sem erro; `prisma.clinicalEvidenceReport` acessível |
| 1.2 | schema | Conferir enum | Usa `DiagnosisStatus`, não cria enum novo |

## T-2 — Europe PMC (servidor)
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 2.1 | lib | `searchLiterature("patellofemoral pain exercise", 8)` | Resultados reais classificados/ordenados (SR no topo) |
| 2.2 | lib | pubType escalar / timeout | Não quebra; erro tratado |
| 2.3 | lib | Inspecionar query | Só termos clínicos (sem PII) |

## T-3 — Pipeline
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 3.1 | lib | Gerar de uma triagem sem red flag | evidence + crossRef + suggestions rastreáveis; status DRAFT |
| 3.2 | lib | Triagem com red flag | redFlag=true, sem sugestões, DRAFT com alerta |
| 3.3 | lib | Provider | Claude/callAIClinical; pseudonimização aplicada |
| 3.4 | lib | Forçar erro de IA | grava `error`, não derruba |

## T-4 — Auto-gatilho + job
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 4.1 | API | Submeter triagem | cria report GENERATING; resposta ao paciente não trava |
| 4.2 | API | autosave | não cria report |
| 4.3 | job | Rodar o job | GENERATING → DRAFT |
| 4.4 | API | Submeter 2× | não duplica report para a mesma triagem |

## T-5 — Aba admin
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 5.1 | UI | Ficha do paciente → aba "Evidência" (DRAFT) | Relatório com identidade BPR (logo/paleta/fontes) |
| 5.2 | UI | Estado GENERATING / error | spinner / aviso + regenerar |
| 5.3 | UI | Red-flag | banner, sem sugestões |
| 5.4 | UI | Ações de status | DRAFT→UNDER_REVIEW→APPROVED grava approvedAt/reviewedById |
| 5.5 | API | Sem sessão staff | 401/403 |
| 5.6 | UI | Portal do paciente | relatório **não** aparece |

## T-6 — Bilíngue
| # | Tipo | Passos | Esperado |
|---|------|--------|----------|
| 6.1 | UI | Toggle EN/PT | rótulos trocam; default en-GB |
| 6.2 | API | "Traduzir PT" | preenche narrativePt sem truncar; idempotente |
| 6.3 | UI | Estudos | títulos/autores permanecem no original |
