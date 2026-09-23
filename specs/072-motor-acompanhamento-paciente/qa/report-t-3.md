# QA — T-3: `AutomationRule`, regras em banco com uma automação migrada

**Data:** 23/09/2026 · **Branch:** `brunoto02028/motor_acompanhamento` · **Commit:** `c41c6c91`
**Ambiente:** Next dev `:4000` · Postgres `bpr_clinic_local` · `NODE_ENV=development`, sem
`OUTBOUND_MODE` e sem `OUTBOUND_ALLOWLIST` (todo e-mail é descartado pelo `outbound-guard`)
**Resultado: APROVADO COM RESSALVAS** (corrigidas depois; ver `report-t-3-recheck.md`)

> Os seis cenários da qa-spec e o cenário zero passam. O limite realmente saiu do código: mudar
> `condition` na tabela muda o comportamento no run seguinte, sem deploy, e a regra da clínica ganha
> da global nos dois sentidos. A saída do `daily-adherence` é a mesma de antes da migração — mesmo
> paciente, mesmo texto, mesmo audit log.
>
> As ressalvas: **o texto não saiu do código** (F2 — `actionData.messageEn` é lido e depois
> descartado) e **duas linhas globais com o mesmo `code` fazem a regra em vigor trocar sozinha**
> (F1 — um `UPDATE` só no `name` virou 2 alertas em 0).

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| 0 | `migrate diff` schema × schema, sem `DROP` | ✅ |
| 3.1 | Saída idêntica à de antes da migração | ✅ |
| 3.2 | Mudar o limite na tabela muda o comportamento, sem deploy | ✅ |
| 3.3 | `active: false` na clínica A; B continua disparando | ✅ |
| 3.4 | `evaluateCondition` por operador + condição malformada | ✅ |
| 3.5 | Cria `Alert` LOW e **não** manda mensagem | ✅ |
| 3.6 | As outras 12 rotas de cron intocadas | ✅ |
| E1 | Duas regras globais com o mesmo `code` | ❌ **F1** |
| E2 | Laço em todas as clínicas não vaza mensagem | ✅ |
| E3 | Isolamento na origem do dado | ✅ |
| E4 | `actionData.messageEn` chega ao paciente | ❌ **F2** |
| E5 | Janela do dedupe corresponde ao dia | ⚠️ **F3** |

Menores: **F4** (título descola do limite), **F5** (`titlePt` semeado e nunca lido), **F6**
(`ne`/`nin` falham abertos com fato ausente).

## 3.1 — saída idêntica ✅

A versão anterior foi **executada de verdade**, não simulada: `git show
c41c6c91~1:app/api/cron/daily-adherence/route.ts` rodada por um harness `tsx` que monta um
`NextRequest` real e substitui `globalThis.fetch` por um interceptador que **bloqueia** qualquer
destino fora de `localhost`.

| | ANTES | DEPOIS |
|---|---|---|
| destinatário | `qa.pacientea@example.test` | idêntico |
| assunto | `BPR Rehab — Notification` | idêntico |
| `remindersSent` | 1 | 1 |
| descrição no `AuditLog` | `Daily adherence reminder sent to QA qa.pacientea` | idêntica |
| e-mails enviados | 0 (descartado pelo guard) | 0 |

Ao fim da sessão: `OUTBOUND-SINK` = 8, `Sent via Resend` = **0**, `[FETCH-OUT]` no harness = **0**.

O texto é idêntico nas duas versões **porque nenhuma das duas usa o texto da regra** — ver F2.

## 3.2 — o limite manda, sem deploy ✅

Cada linha: alterar a regra pelo banco → limpar alertas e audit → `POST`. Sem restart, sem rebuild.

| Estado da regra | `alertsRaised` | `remindersSent` |
|---|---|---|
| ALERT `gte:3` (seed) | 1 | 1 |
| ALERT `gte:99` | 0 | 1 |
| ALERT `gte:1` | 2 | 1 |
| ALERT `active:false` | 0 | 1 |
| REMINDER `gte:3` (paciente tem 2) | 0 | **0** |
| REMINDER `active:false` | 0 | **0** |

## 3.3 — regra por clínica ✅

Global `gte:99` + linha da `qa-clinic-a` com `gte:1` → só a A dispara, e `loadRule` confirma que a
linha da clínica venceu. Invertido: global ativa + linha da A com `active:false` → só a B dispara.

## 3.4 — `evaluateCondition` ✅

17/17 no jest, mais 26 casos adversariais do QA, **0 divergências**. Falha fechada em operador
aninhado, número como string (no fato e no limite), `in`/`nin` com objeto, `{}` como operador,
operador desconhecido sozinho ou misturado, `condition` `null`/array/string/número/`undefined`,
fato ausente com `gte`/`eq`, `null`, `NaN`, booleano no lugar de número, e chaves `__proto__` /
`constructor` vindas de `JSON.parse`.

## 3.5 e 3.6 ✅

Alerta com `details` (quantidade e títulos) e prioridade do `actionData`; `remindersSent: 0` nessa
clínica e nenhuma linha de envio. Segunda execução no mesmo dia: `alertsRaised: 0` (dedupe da T-2).

`git diff --stat` toca 6 arquivos; das 13 pastas em `app/api/cron/`, só `daily-adherence` aparece.

## Falhas

### F1 — duas regras globais: a regra em vigor troca sozinha ❌

O `@@unique([code, clinicId])` não barra a segunda linha global. O efeito não estava documentado:
**qual das duas vale segue a ordem física da tabela**, e um `UPDATE` que não muda nada de semântico
inverte o resultado.

```
[apos criar a duplicata]  ctid (0,11)=ORIGINAL(gte:1) (0,12)=DUPLICATA(gte:99)  -> alertsRaised: 2
[UPDATE so no name da ORIGINAL]  ctid (0,12)=DUPLICATA (0,14)=ORIGINAL          -> alertsRaised: 0
[UPDATE so no name da DUPLICATA] ctid (0,14)=ORIGINAL (0,15)=DUPLICATA          -> alertsRaised: 2
```

Pior que aleatório: **`loadRule` e `loadRules` discordaram no mesmo instante e no mesmo banco** —
`where` diferentes, planos diferentes, ordens diferentes. Nenhuma das duas tinha `orderBy`.

### F2 — o limite saiu do código, o texto não ❌

A rota lê `actionText(reminderRule, "messageEn")` e passa como `plainMessage`. Mas a mesma chamada
passa `useReminderTemplate: true`, e nesse ramo o `notifyPatient` **descarta**
`plainMessage`/`plainMessagePt`: o texto vem de `buildTodayReminderText` +
`getReminderTemplates` (ativ. 62).

```
regra.actionData.messageEn = "You still have activities left in today's plan — ..."
html do lembrete contem esse texto: false
```

Quem editar a mensagem na regra vai achar que mudou o que o paciente recebe, e não mudou nada.

### F3 — a janela do dedupe está um dia atrasada ⚠️

```
dedupeKey: ...:2026-09-22          alert.createdAt: 2026-09-23T10:17Z
```

`setHours(0,0,0,0)` é local, `toISOString()` é UTC. Em BST a meia-noite local de 23/09 é
`2026-09-22T23:00:00Z`. Não quebra o dedupe (o rótulo é consistente dentro do dia), mas a chave
mente sobre a data — e a T-5 vai construir em cima dela.

### F4, F5, F6 ⚠️

- **F4:** com `gte:1`, o alerta saiu como *"Three or more activities missed today"* com
  `missingItems: 2`. `condition` e `titleEn` são independentes e nada os amarra.
- **F5:** `titlePt` é semeado e nunca lido — a rota só chama `titleEn`.
- **F6:** `{ locale: { ne: "pt-BR" } }` com `facts = {}` responde **true**. Coerente com `!=`, mas
  contradiz o "fails closed" do docblock: um fato que o motor nunca calculou faz a regra disparar.

## Notas

- **Caminho do teste:** a tarefa listava `lib/automation/rules.test.ts`; o entregue é
  `__tests__/automation/rules.test.ts` — que é o **certo**, porque o `testMatch` do jest é
  `**/__tests__/**`.
- **E2:** nenhuma mensagem vazou para clínica que não optou. O `results` mudou de forma (ganhou
  `alertsRaised` e lista clínica que não recebeu nada); não há consumidor no repo.
- **Banco compartilhado:** depois de todos os cenários terem rodado, o outro worktree derrubou
  `alerts` e `automation_rules`. Recriadas com `prisma db execute` e re-semeadas; smoke conferido.
  Nenhum resultado deste relatório depende do que aconteceu depois do drop.
- **Estado final:** restaurado e conferido contra snapshot. Regras com valores idênticos, ids novos
  (perdidos no drop). `dailyRemindersEnabled` de volta a `false` em todas as clínicas.
