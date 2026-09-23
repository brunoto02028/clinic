# QA — T-7: trocar o `SEND_MESSAGE` do `daily-adherence` por enfileirar

**Data:** 23/09/2026 · **Commit:** `17a6a58a`
**Resultado: APROVADO COM RESSALVAS** — as três tratadas em `d8aafe90`
(ver `report-t-7-recheck.md`)

| # | Critério de aceite | Resultado |
|---|---|---|
| 0 | Cenário zero — schema sem `DROP` | ✅ |
| 1 | Com lembrete ligado, o cron **não envia**: cria linha na fila | ✅ |
| 2 | E-mail entregue tem o **mesmo `sha256`** do de hoje | ✅ |
| 3 | "Lembrete enviado hoje" continua verdadeiro | ✅ *(mas ver R1)* |
| 4 | Cron duas vezes no mesmo dia → **uma** linha | ✅ |
| 5 | Nenhum texto novo contém "Rehab" | ✅ |
| — | `CHANNEL_NOT_SUPPORTED` segura com motivo | ✅ |
| R1 | Envio manual × fila: duplicata possível | ❌ |
| R2 | Guarda de hash não cobre `templateVars` | 🟠 |
| R3 | Sem teste automatizado de `enqueueMessage` | 🟡 |

## 1 e 4 — o cron enfileira e não envia

```
CRON 1a vez -> remindersQueued: 1     2a vez -> 0
OUTBOX(1): AWAITING_APPROVAL | sentAt null | templateCode TODAY_REMINDER
AUDIT 'lembrete enviado' hoje: 0      PatientOutboundEmail: 0

depois de um humano aprovar pela tela:
  SENT | sentAt 12:44 | approvedBy <staff>
  AUDIT: 1              PatientOutboundEmail: 1
```

Verificação estática complementar: o cron importa `enqueueMessage` e **não** importa `sendEmail`
nem `notifyPatient`.

## 2 — o hash bate

```
sha256 fila    : 2add20efce27732a2a191b2af9415175e4c10f89415e823d079b8011d6d7565e
sha256 direto  : 2add20efce27732a2a191b2af9415175e4c10f89415e823d079b8011d6d7565e
sha256 generico: 8341c71f...   <- SEM o templateCode, seria outro e-mail
bytes: 3620 / 3620
```

No HTML entregue: saudação `"Hi QA,"`, botão `"View My Exercises →"`, link para
`/dashboard/treatment`, itens em falta listados. Assunto `Your plan today / Seu plano de hoje` —
sem "Rehab".

## R1 — o envio manual e a fila não sabem um do outro ❌

**Direção A** — o staff já mandou hoje pelo botão, e o cron enfileira outro:
```
audit 'lembrete enviado hoje': 1 | fila: []
cron -> remindersQueued: 1 | fila: [AWAITING_APPROVAL]
```

**Direção B** — a fila tem um lembrete, e o painel diz que nada foi enviado:
```
fila: [AWAITING_APPROVAL]
GET /api/admin/patients/<id>/adherence-today -> {"reminderSentAt": null}
```

O painel mostra "não enviado", oferece "Send now", e esse botão passa no próprio dedupe. A
duplicata não sai sozinha — alguém precisa aprovar —, mas **nada na fila avisa o aprovador de que
o paciente já recebeu hoje**, que é justamente a informação que o faria clicar em "Discard".

## R2 — a guarda de hash não cobre o `templateVars` 🟠

```
previa: hash=905426978c6d570f  htmlSha=1358f9d7...
  (troco o templateVars depois da aprovacao)
depois: hash=905426978c6d570f  htmlSha=49c3ab2f...
o hash da guarda mudou? false | o HTML mudou? true
entregue contem "EXERCICIO TROCADO"? true | contem o que o aprovador leu? false
```

No caminho de texto a guarda **funciona**: mudar `bodyEn` ou `subjectEn` depois de aprovar dá
`"The message changed since it was approved"` e a linha vai a `FAILED`.

## R3 — falta o teste automatizado 🟡

`grep enqueueMessage` em `*.test.ts` não acha nada. O critério 4.1 da T-4 pede exatamente
*"teste que falha se o dispatcher for chamado"*, e a garantia mais sensível do produto dependia de
QA manual.
