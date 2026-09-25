# QA - atividade 080

## T-1 - consumo de sessao

| tipo | cenario | esperado |
|---|---|---|
| API | pacote de 10, marcar 10 | as 10 entram como sessao |
| API | a 11a | nao entra como sessao de pacote |
| API | cancelar uma | sessao devolvida |
| API | `NO_SHOW` | **nao** devolve |
| API | pacote vencido com sessoes sobrando | nao oferece sessao |
| API | pacote de outra clinica | nao entra na conta |
| API | `sessionsUsed` depois de tudo | bate com as consultas ligadas |

## T-2 - a porta

| tipo | cenario | esperado |
|---|---|---|
| API | sem triagem | recusado, com motivo legivel |
| API | novo com triagem | `FIRST_CONSULTATION`, preco do ServicePrice |
| API | com sessao | `PACKAGE_SESSION`, preco 0 |
| API | pacote esgotado | `EXTRA_SESSION`, preco avulso |
| API | `price: 0.30` no corpo | **ignorado** |
| API | `treatmentType` forjado | ignorado |
| API | pagamento nao concluido | horario **nao** reservado |
| API | webhook duplicado | nao cria duas consultas |
| API | paciente de outra clinica | recusado |

## T-3 - a tela

| tipo | cenario | esperado |
|---|---|---|
| UI | os quatro estados | texto certo em cada um |
| UI | preco | visivel antes de confirmar |
| UI | triagem pendente | leva a triagem |
| UI | cancelar no Stripe | volta sem reservar |
| UI | EN e PT | ingles primeiro |

## T-4 - a clinica

| tipo | cenario | esperado |
|---|---|---|
| API | clinica marca | sem cobranca automatica |
| API | cortesia | consome com registro de autor |
| API | isencao | sem cobranca, com registro |
| API | outra clinica | recusado |

## Fora de alcance sem aparelho
O Checkout do Stripe abrindo no navegador do sistema e a volta para o app.
