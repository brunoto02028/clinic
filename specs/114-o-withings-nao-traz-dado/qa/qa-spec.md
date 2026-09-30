# QA — Atividade 114

**Este QA toca dado clínico.** Paciente de teste, ou a conta do Bruno com
autorização dele na hora. Nunca a de um paciente real.

## T-1 — a medição

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | banco | Pontos de dado por tipo e por data | Uma tabela, sem buraco |
| 1.2 | banco | Token: validade e expiração | Escrito, com a data |
| 1.3 | API | Assinaturas ativas na Withings | A lista, por `appli` |
| 1.4 | log | Webhooks recebidos nos últimos dias | Quantos, e com que resposta |

## T-2 — o cartão

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | Conexão viva, dado de hoje | Diz hoje |
| 2.2 | UI | Conexão viva, último dado de 6 dias | **Diz os 6 dias** — não "hoje" |
| 2.3 | UI | Token expirado | Diz que parou, e o que fazer |
| 2.4 | UI | Nunca conectado | Convida a conectar |

O **2.2 é o cenário do Bruno**, e é o que reprova a tela de hoje. O 2.1 é o
controle: sem ele, um cartão que sempre dissesse "parado" passaria.

## T-3 — a assinatura

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | API | Webhook com a gravação falhando | Responde **0** mesmo assim |
| 3.2 | API | Assinatura derrubada de propósito | A verificação acha e **avisa** |
| 3.3 | UI | Medida nova no aparelho | Aparece no app sem ninguém apertar nada |
| 3.4 | API | Contagem de chamadas num dia cheio | Longe das 5.000 |

O 3.1 é o que protege a assinatura: se o webhook recusar o aviso quando a
gravação falha, a Withings desliga a assinatura e o silêncio vira permanente.

## T-4 — a tela

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | Sem conexão | Diz isso, e leva a conectar |
| 4.2 | UI | Conectado, sem dado nos 7 dias | Diz **quando foi o último** |
| 4.3 | UI | Falha ao ler | Diz que falhou, e não "sem dado" |
| 4.4 | UI | **Com dado** (o controle) | Mostra — senão o texto vira desculpa |

## O que não se faz neste QA

- Não se mede com a conta de um paciente real.
- Não se apaga dado de saúde para reproduzir um estado: o estado vazio se
  reproduz com paciente de teste, não apagando o de alguém.
