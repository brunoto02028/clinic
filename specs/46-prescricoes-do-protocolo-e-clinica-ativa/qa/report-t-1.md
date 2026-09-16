# QA — T-1: Prescrições presas ao protocolo

**Resultado:** APROVADO
**Data:** 16/09/2026 · **Commits:** 097cf02, 96091a0, e2ed910 · **Ambientes:** local (Next dev :4100, banco local) e produção (bpr.clinic)

## Unit
`npx jest` → 31 suítes, 332 testes, todas passando (inclui `prescription-visibility`,
`patient-exercises-route`, `assign-route`). `tsc --noEmit` sem erros nos arquivos tocados.

## Local
| Cenário | Obtido |
|---|---|
| Backfill numa base com 2 prescrições automáticas (criadas junto de um plano) + 1 manual | "Linked 2 prescription(s) to their protocol, left 3 standalone"; 2ª execução: "Already ran — skipping" (marcador `prescription-protocolid-backfill-done`) |
| Paciente com plano enviado, semanas 1–2 liberadas | vê 1 prescrição (a da semana liberada); a manual, de um exercício que só existe em semana escondida, continua escondida (decisão registrada no plan.md) |
| Plano arquivado | as prescrições do plano somem; a manual aparece |
| Plano em rascunho (DRAFT) | igual ao arquivado |
| Plano restaurado (SENT) | volta só a da semana liberada |

## Produção
| Cenário | Obtido |
|---|---|
| Backfill no boot | as 5 prescrições da Ana ficaram ligadas ao protocolo de origem (o arquivado de 13/09); nenhuma sobrou solta |
| **Ana não muda** | conjunto visível pela regra antiga = pela regra nova = 5; o protocolo enviado dela segue com 20 itens visíveis de 58 |
| Atribuir o ACL (semanas 1–2) a paciente descartável | 201, 28 prescrições criadas, todas com `protocolId` do protocolo novo |
| Paciente logado | 5 exercícios e "5 new exercises to start" |
| Arquivar o plano | 0 exercícios e nenhuma notificação de exercícios |
| Restaurar o plano | volta a 5 exercícios e a notificação |
| Prescrever à mão um exercício ainda preso ao plano arquivado (achado 2 da revisão) | a prescrição é adotada (vira avulsa) e a paciente passa a vê-la |

## Observação
A resposta dessa prescrição manual passou a contar as adotadas como `restored` (commit e2ed910),
para o fisioterapeuta não ler "0 prescritos, 1 já prescrito" quando o exercício de fato voltou.
