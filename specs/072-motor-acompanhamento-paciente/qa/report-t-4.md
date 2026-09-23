# QA — T-4: fila de aprovação unificada (`OutboundMessage`)

**Data:** 23/09/2026 · **Commit:** `994a561a` · **Branch:** `brunoto02028/motor_acompanhamento`
**Ambiente:** Next dev `:4000` · Postgres `bpr_clinic_local` · `NODE_ENV=development` · servidor em Europe/London
**Resultado: APROVADO COM RESSALVAS** — 105 asserções, 102 ✅, 3 ❌ (2 achados). As duas ressalvas
foram tratadas; ver o fim.

> **A garantia central se sustenta.** Nada chegou a um paciente sem clique humano em nenhum dos
> caminhos atacados: enfileiramento, corrida de aprovação, reaprovação, aprovação cruzada entre
> clínicas, paciente logado, despachante automático.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| 0 | `migrate diff` schema × schema, sem `DROP` | ✅ |
| 4.1 | `enqueueMessage()` nunca envia | ✅ |
| 4.2 | Prévia EN+PT com logo BPR (paciente en-GB) | ✅ |
| 4.2f | Prévia com inglês primeiro (paciente pt-BR) | ❌ **F2** → decidido pelo Bruno |
| 4.3 | Aprovar entrega uma vez, grava `sentAt` + ator | ✅ |
| 4.4 | Aprovar de novo não entrega | ✅ |
| 4.5 | Descartar não entrega, registra ator e horário | ✅ |
| 4.6 | Silêncio segura, não descarta; entrega depois | ✅ |
| 4.7 | Teto diário segura a 4ª | ✅ |
| 4.8 | Clínica A não vê a fila da B | ✅ |
| 4.9 | Sem consentimento / sem e-mail: segura e diz por quê | ✅ |
| E1 | Corrida de aprovação: só um entrega | ✅ |
| E2 | Prévia === o que saiu, byte a byte | ✅ |
| E3 | Vazio × falha × erro de ação | ✅ |
| E4 | Paciente não abre a tela nem a API | ✅ |
| E5 | Despachante só toca em `APPROVED` | ✅ |
| E6 | Contraste na shell escura do admin | ❌ **F1** → corrigido |

## 4.1 — nunca envia, e a evidência é honesta

Resultado: 1ª `queued=true`, 2ª `false`, mesmo id, `AWAITING_APPROVAL`, **0 chamadas ao dispatcher,
0 linhas em `PatientOutboundEmail`, 0 requisições a provedor**.

**O QA construiu quatro espiões e descartou três**, porque o controle positivo falhou — o espião
não teria detectado um envio de verdade, e "0 chamadas" seria mentira:

| Espião | Controle positivo | Uso |
|---|---|---|
| monkeypatch em `lib/email.sendEmail` (ESM) | ❌ | descartado |
| `module.registerHooks` | ❌ | descartado |
| require-cache via `createRequire` | ❌ | descartado |
| **hook em `console.log`** (`[OUTBOUND-SINK]`/`[EMAIL]`) | ✅ | **usado** |

Validado: durante `enqueueMessage` o contador ficou em 0; ao chamar `deliverMessage` no mesmo
processo subiu para 1.

## 4.6 — horário de silêncio, nas duas viradas

| Instante | Local | Esperado | Obtido |
|---|---|---|---|
| `19:59Z` | 20:59 | fora | `false` ✅ |
| `20:00Z` | 21:00 | **dentro** | `true` ✅ |
| `02:00Z` (+1d) | 03:00 | dentro (passou a meia-noite) | `true` ✅ |
| `06:59Z` | 07:59 | dentro | `true` ✅ |
| `07:00Z` | 08:00 | **fora** | `false` ✅ |

Ciclo completo: aprovada às 22:30Z → `held: QUIET_HOURS`, linha **`APPROVED`**, `sentAt` nulo, 0
e-mails. `deliverApprovedMessages` às 11:00Z do dia seguinte → `SENT`, exatamente 1 e-mail.

**Pela rota real:** como não dá para mover o relógio do servidor, o QA moveu o da clínica
(`qa-clinic-a` → `Pacific/Auckland`, 23:05 lá). `approve` → `200 {"sent":false,"held":"QUIET_HOURS"}`.
Timezone restaurada depois.

## 4.7 e 4.9

```
4 mensagens, todas aprovadas  -> [sent, sent, sent, held: DAILY_CAP]
holdReasonFor(id, amanha)     -> null   (o teto solta sozinho na virada)
sem consentAcceptedAt         -> held: NO_CONSENT
sem e-mail                    -> held: NO_EMAIL
```

E a fila **diz por quê na tela**: *"Approved, not sent yet — the patient already had the day's
messages — it goes out tomorrow"*.

## E1, E2, E4, E5

- **Corrida:** dois `approve` simultâneos com o hash correto, sessões diferentes → um `200`, outro
  `409`; **1 e-mail** gravado.
- **Prévia === envio:** 2661 bytes de cada lado, **idênticos byte a byte**; `contentHash` do log ===
  hash da prévia === `approvedHash` da linha.
- **Isolamento:** clínica B leva 404 nos três endpoints e a linha da A segue intacta. Paciente:
  403 nos quatro endpoints, redirecionado ao tentar a tela.
- **Despachante:** com linhas em `AWAITING_APPROVAL`, `DISCARDED` e `FAILED`, entregou **0**.

## Achados

### F1 — o texto da fila era ilegível na shell escura ❌ → **corrigido**

`/admin/outbox` é onde alguém precisa **ler** antes de aprovar. Medições no browser:

| Elemento | Contraste | AA (4.5:1) |
|---|---|---|
| `h2` "Waiting for you" | **1.04:1** | ❌ |
| Assunto da mensagem | **1.15:1** | ❌ |
| (referência: `text-foreground`) | 12.21:1 | ✅ |

`app/globals.css` diz *"Admin stays dark"*; o componente usava `text-slate-*` de tema claro. A
central de alertas da T-2 tinha o mesmo defeito — o QA dela passou porque as capturas foram feitas
na rota `/dashboard`, clara, antes de a tela mudar de lugar.

**Corrigido** nas duas, com os tokens do design system. Medido depois: **14.61:1** em
`/admin/outbox`, `/admin/alerts` e `/admin/automation`.

### F2 — ordem das línguas para paciente pt-BR ❌ → **decisão do Bruno, critério corrigido**

```
paciente pt-BR : "Hora dos seus exercicios / Time for your exercises"  -> ingles primeiro? false
paciente en-GB : "Time for your exercises / Hora dos seus exercicios"  -> ingles primeiro? true
```

`lib/patient-email.ts` ordena pela língua do paciente (herdado da ativ. 68). O critério de aceite
que eu havia escrito dizia "inglês primeiro" — e o QA fez certo em não assumir qual regra valia.

**Decidido em 23/09: a língua do paciente vem primeiro.** "Inglês primeiro" é regra de **autoria e
revisão**, não de entrega — quem lê o e-mail é o paciente. O critério da T-4 e o cenário 4.2 foram
corrigidos; o código não mudou.

### F3 a F9 — registrados, nenhum bloqueia

| # | Achado |
|---|---|
| F3 | `templateCode` e `providerId` do passo 1 não existem no modelo. O id do provedor é descartado — uma entrega não pode ser rastreada até o provedor depois do fato |
| F4 | `NO_EMAIL` é defensivo: `User.email` é NOT NULL, só se chega lá com string vazia |
| F5 | O teto diário usa a meia-noite **do servidor**, enquanto o silêncio usa a **da clínica**. Invisível hoje (tudo em Europe/London); vira bug real na primeira clínica em outro fuso |
| F6 | O hash cobre o texto, não o HTML: mudança de layout entre prévia e envio passaria. Herdado da ativ. 68 |
| F7 | API sem sessão responde 307 para HTML, não 401 — comportamento de plataforma |
| F8 | `/discard` grava o ator em `approvedById`: numa linha `DISCARDED`, "approved by" quer dizer "descartada por" |
| F9 | O arquivo da tarefa apontava para `app/dashboard/outbox` — corrigido |

## Notas

- **A logo não renderiza localmente:** `lib/email-templates.ts` monta a URL a partir de
  `NEXTAUTH_URL` (`:3000`) enquanto o dev roda em `:4000`. A marcação está correta e a `<img>` está
  lá (`alt="Clinic logo"`); a conferência visual da logo precisa de prod.
- **Banco restaurado e verificado:** 27 linhas de teste apagadas, 10 entregas apagadas, timezone da
  clínica e e-mail do paciente restaurados. *"RESTORED: database matches the state QA found it in."*
- Nenhum paciente real tocado; tudo em `@example.test`/`@example.com`.
