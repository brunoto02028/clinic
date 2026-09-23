# QA (reverificação) — T-7: migrar o envio para a fila

**Data:** 23/09/2026 · **Commit:** `d8aafe90` · ressalva final corrigida em `2dd6dbfa`
**Resultado: APROVADO**

| # | Item | Antes | Agora |
|---|---|---|---|
| R1a | Cron enfileira depois do "Send now" | ❌ | ✅ |
| R1b | "Send now" com um na fila | ❌ | ✅ `already_queued_today` |
| R1c | `adherence-today` devolve `reminderQueuedAt` | ❌ | ✅ |
| **R1d** | **A tela mostra o estado "na fila"** | ❌ | ✅ **em `2dd6dbfa`** |
| R2 | Trocar `templateVars`/`templateCode` depois de aprovar | enviava ❌ | ✅ recusa |
| R3 | Teste `outbox-never-sends` | não existia ❌ | ✅ com controle positivo |
| — | `sha256` do e-mail entregue | `2add20ef…` | ✅ inalterado |

## R1 — não há mais caminho para dois lembretes no mesmo dia

```
A) staff ja mandou hoje -> cron: remindersQueued 0, fila vazia   (era 1 e uma linha)
B) ha um na fila        -> GET adherence-today: reminderQueuedAt preenchido
                           POST send-reminder : {"sent":false,"reason":"already_queued_today"}
```

**R1d, que reprovava:** o `reminderQueuedAt` saía da API e nenhum componente o lia. O painel
mostrava "Send now", o clique devolvia `already_queued_today` e a tela não mudava **um caractere** —
o terapeuta podia clicar três vezes achando que estava quebrado, sem saber que a mensagem esperava
a aprovação dele.

Corrigido em `2dd6dbfa`: o painel mostra **"Waiting for your approval"** com link para
`/admin/outbox` em vez do botão de envio, e a recusa vira mensagem em vez de silêncio.

## R2 — a guarda cobre o layout

```
previa : hash=6005cf635554  htmlSha=1358f9d79481
  (troco os templateVars depois da aprovacao)
depois : hash=cc60cd7f9778  htmlSha=947169e477be
deliverMessage -> {"sent":false,"error":"The message changed since it was approved"}
linha -> FAILED | log de e-mail gravado: 0
trocar templateCode -> tambem recusa
controle (nada mudou) -> {"sent":true}
```

O controle importa: a guarda não ficou paranoica a ponto de bloquear a entrega normal.

## R3 — o teste tem controle positivo

O QA injetou um `sendEmail` real no caminho de enfileiramento:

```
Expected number of calls: 0    Received number of calls: 2
Test Suites: 1 failed, 2 passed    Tests: 2 failed, 27 passed
```

Desfeito, `git diff` vazio, 29/29 de volta. Não é um "zero chamadas" vazio — ele detecta um envio
de verdade, que era a razão de existir.

## Regressão — o e-mail não mudou

```
sha256 fila === sha256 direto : 2add20ef…d6d7565e  | 3620 bytes cada
saudacao "Hi QA," | CTA "View My Exercises →" | assunto sem "Rehab"
```

## Observação de baixa relevância

O `contentHash` gravado em `PatientOutboundEmail` passou a ser o hash composto para mensagens com
template, em vez do hash de texto da ativ. 68. Se algum dia alguém comparar `contentHash` entre
e-mail da fila e e-mail escrito por staff, eles não serão comparáveis. Nada lê isso hoje.

## Itens carregados desta rodada, tratados em `2dd6dbfa`

- `actionData.auditAction` removido do seed — nada o lia.
- `failures[].error` deixou de devolver a mensagem inteira do Prisma (que levava `patientId` e
  títulos de exercício para a resposta **e** para o log de produção). Reporta a primeira linha; o
  stack fica no servidor.
