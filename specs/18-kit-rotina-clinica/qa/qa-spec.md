# QA Spec — Atividade 18 (Kit de Rotina Clínica)

Autenticação: a área é admin/staff → cenários de auth incluídos (sem sessão / role errada).

## T-1 — Discovery (revisão, não runtime)
- Revisão do `report-t-1.md`: mapa do fluxo atual + decisão de migração. Sem cenário runtime.

## T-2 — Protocolos-piloto (seed)
| Tipo | Passos | Esperado |
|------|--------|----------|
| API/script | Rodar o seed | 3 `ProtocolTemplate` criados |
| API/script | Rodar o seed 2× | Sem duplicatas (idempotente) |
| UI | Abrir `admin/protocols` | Os 3 templates aparecem, com EN e PT |
| Conteúdo | Ler cada template | 2–4 citações; texto autoral (sem cópia) |

## T-3 — Aplicar protocolo ao paciente
| Tipo | Passos | Esperado |
|------|--------|----------|
| UI | Aplicar template a um paciente de teste | Plano + itens/prescrições criados no prontuário |
| UI | Abrir o plano gerado | Itens conferem com o template; origem registrada |
| API | Aplicar com paciente inexistente | Erro tratado (400/404), nada criado |
| Auth | Chamar endpoint sem sessão / role não-admin | 401/403 |
| UI | Alternar EN/PT | Textos do plano/itens traduzidos |

## T-4 — Progressão/regressão no Exercise
| Tipo | Passos | Esperado |
|------|--------|----------|
| API/script | Rodar seed de exercícios | Exercícios criados e encadeados por nível |
| UI | Abrir `admin/exercises` | Progressão/regressão visível; bilíngue |

## T-5 — Progredir/regredir na prescrição
| Tipo | Passos | Esperado |
|------|--------|----------|
| UI | Progredir um item de prescrição | Exercício trocado pela progressão; histórico mantido |
| UI | Regredir | Volta ao anterior |
| UI | Item sem progressão | Opção não aparece / desabilitada |

## Limpeza
- Remover paciente de teste, plano e prescrições criados no QA.
