# QA — Atividade 14: Skill clinical-evidence-report

Evidências em `qa/` (outputs de script colados, relatório de exemplo, alerta de red-flag).
A skill **não tem UI própria** — o QA é de artefatos (arquivos) e execução do script.

---

## T-1 — SKILL.md
| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 1.1 | arquivo | Abrir `Skills/clinical-evidence-report/SKILL.md` | Frontmatter válido; seções do doc presentes; seção de limites íntegra |
| 1.2 | arquivo | Conferir referências | Aponta red-flags.md, templates e script pelos caminhos certos |

## T-2 — red-flags.md
| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 2.1 | arquivo | Ler o checklist | Categorias (neuro/fratura/malignidade/infecção/vascular/sistêmica) com sinais reconhecíveis na triagem |
| 2.2 | arquivo | Ação por categoria | "Parar + encaminhar", tom conservador |

## T-3 — search_literature.js
| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 3.1 | script | `node ... "patellofemoral pain syndrome exercise therapy" 10` (rede real) | JSON com id/title/journal/year/language/pubType + evidenceLevel/Rank |
| 3.2 | script | Conferir ordenação | Systematic review/meta-analysis no topo; ordem por evidenceRank desc |
| 3.3 | script | Rodar 2x o mesmo input | Classificação idêntica (determinística) |
| 3.4 | script | Simular falha de rede (query inválida/host) | stderr claro + exit ≠ 0 |
| 3.5 | script | Inspecionar a query enviada | Só termos clínicos; **nenhuma PII** |

## T-4 — report-template.md
| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 4.1 | arquivo | Ler o template | Seções fixas do doc; nenhuma extra; cada sugestão com campo de fonte |
| 4.2 | arquivo | Aviso clínico | Presente no fim, marcado como imutável |
| 4.3 | arquivo | Separação de recursos | "disponível agora" vs "fora do catálogo" |

## T-5 — clinic-resources.example.json
| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 5.1 | arquivo | Validar JSON | Válido; `equipment`/`exercises`/`protocols` |
| 5.2 | arquivo | Campos | Compatíveis com ExercisePrescription/TreatmentProtocol; exemplos fictícios; instrução de cópia |

## T-6 — Integração (dry-run)
| # | Tipo | Passos | Resultado esperado |
|---|------|--------|--------------------|
| 6.1 | e2e | Triagem de exemplo (sem red flag) → seguir SKILL.md | Relatório preenchido, fontes rastreáveis, cruzamento com o catálogo |
| 6.2 | e2e | Triagem com red-flag (dor noturna + perda de peso) | Skill **para**; só o alerta; nenhuma busca/sugestão |
| 6.3 | e2e | Conferir relatório final | Aviso clínico presente; sem PII enviada à Europe PMC |
