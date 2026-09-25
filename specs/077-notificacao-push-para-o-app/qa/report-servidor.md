# QA 077 — lado servidor, local

**Data:** 25/09/2026 · **Alvo:** `http://localhost:4079` (este worktree, PID 35296 confirmado)

| tarefa | veredito |
|---|---|
| **T-2** rota de registro | aprovado, com 1 ressalva |
| **T-3** envio Expo Push | **aprovado** — lote, recibo, token morto, serviço fora do ar, sink: todos medidos |
| **T-4** painel (servidor) | aprovado com ressalvas — escopo de tenant sólido; 2 falhas de registro/aviso |
| **T-5** garantia "nenhum cron manda push" | **aprovado** — prova estática + execução |
| **T-5** gatilhos e texto | **reprovado** — 1 gatilho sem call site, 1 quinto ponto com texto clínico |
| T-1, T-6, T-7 (tela) | fora de alcance sem iPhone — **não aprovados** |

## Nada saiu para a exp.host

| prova | resultado |
|---|---|
| `OUTBOUND_MODE` | `sink`; nada no `.env` sobrescreve |
| pushes tentados | 3, todos barrados e logados como `[OUTBOUND-SINK] push` |
| `exp.host` no log | **0** ocorrências |
| cache DNS da máquina | nenhuma entrada para `exp.host` — um fetch real teria resolvido o nome |
| conexões TCP externas do dev server | nenhuma |
| onde o corpo precisou ser medido | `globalThis.fetch` substituído **antes** do `import("@/lib/push-send")` |

## Falhas — e o que foi feito

### #4 (a pior) — `patient-tasks` mandava texto clínico para a tela bloqueada · CORRIGIDA

Um **quinto** ponto de push, fora dos quatro da T-5, chamando o `sendPushToUser` antigo:

```
[OUTBOUND-SINK] push → cmugtieev...: Sign consent for the knee joint injection
body: "Você tem uma nova ação necessária: \"Sign consent for the knee joint injection\" — prazo: 02/10/2026."
data: { "url": "/dashboard/tasks" }
```

Três defeitos no mesmo lugar: o título da tarefa (texto livre da clínica) ia verbatim para a tela
bloqueada; o idioma era fixo em português, com paciente `preferredLocale: "en"`; e o deep link
apontava para uma rota **web** que o app não tem.

Este push existia desde antes da 077 e nunca chegava a lugar nenhum — apontava para a API do
Firebase desligada. **Ao fazer o push voltar a funcionar, eu o ativei.** Agora usa `pushTarefa`:
texto neutro ("Há algo para você resolver"), idioma do paciente, rota do app.

### #5 — `pushDocumento` não tinha call site · CORRIGIDA

`grep` devolvia uma linha só: a própria declaração. O 4º gatilho da T-5 existia no papel e nunca
rodava. Ligado em `app/api/admin/patients/[id]/documents/route.ts`, no `POST` que guarda o
documento.

### #2 — broadcast agendado com push marcado sumia em silêncio · CORRIGIDA

O servidor retorna antes do bloco de push quando há `scheduledFor`, e a tela escondia a caixa sem
zerar o estado: `pushNotify` seguia `true`, ia no corpo, era descartado, e o toast não dizia nada.
Agora agendar **desmarca** o push e a tela diz que um aviso agendado vai só para o app.

### #3 — o histórico não guardava o resultado do push · CORRIGIDA

Dois broadcasts, um com push e outro sem, voltavam indistinguíveis do `GET`. Os números viviam só
no toast; recarregar a página os perdia, e uma falha inteira do serviço não deixava rastro.
`ClinicBroadcast` ganhou `pushSent` e `pushFailed`, o `GET` os expõe e a lista mostra o selo.

### #1 — sem credencial, `/api/push-token` responde 307 e não 401 · REGISTRADA, não corrigida

O branch de bearer no middleware só dispara com o header presente; sem header nenhum a requisição
cai no gate de página. O app **sempre** manda bearer, então na prática ele recebe 401 — medido.
Fica registrado porque é a classe de bug que a T-2 existia para corrigir.

### Ressalvas menores

- **`sent` mentiroso em sink** · CORRIGIDA — devolvia `sent: <nº de aparelhos>` sem enviar nada, e
  o painel dizia "3 devices" com zero chamadas de rede. Agora devolve `sent: 0` e
  `error: "outbound_blocked"`.
- **`outboundAllowed(userIds.join(","))`** · CORRIGIDA — a função compara item a item, e a string
  juntada comparava contra `"id1,id2,id3"`: nenhum paciente de teste podia entrar na allowlist num
  envio com mais de um destinatário.
- `OPTIONS` anuncia `GET` e `PATCH` além de POST/DELETE (cabeçalho compartilhado do middleware).
  Inofensivo.
- `DELETE` de token alheio responde `{"success":true}` sem mudar nada. Seguro e idempotente, mas
  afirma o que não houve.
- `PATCH` com corpo quebrado cai no default `audience:"all"` em vez de 400. É leitura, e é
  tenant-scoped.
- **`PushDeviceToken` não tem relação com `User`** — só `userId String`, sem `@relation`. Apagar um
  paciente deixa token órfão. Não mexi: acrescentar a FK agora exigiria garantir que não há órfãos
  em produção, e isso é uma migração, não um remendo de fim de tarefa.

## T-2 — registro do aparelho

| cenário | resposta | |
|---|---|---|
| `OPTIONS` | 204, `allow-methods` com POST e DELETE | ok |
| bearer passa pelo middleware | **200** (não 307) | ok |
| registra no `userId` certo | token ligado a `qa078-patient-a@x.test` | ok |
| token fora do formato / `[abc` sem fechar / objeto | 400 `bad_token`, sem 500 | ok |
| `platform:"symbian"` | 400 `bad_platform` | ok |
| corpo `{nao-e-json` / vazio | 400 `bad_request` | ok |
| A registrando **em nome de B** | 200, mas gravado no A — não existe campo e o corpo é ignorado | ok |
| bearer forjado | 401 | ok |
| `x-user-id` do B + bearer do A | gravado no A — o middleware apaga o header | ok |
| `DELETE` com token / sem corpo | desativa aquele / todos os 4 do usuário | ok |
| B pedindo `DELETE` do token do A | o token do A seguiu ativo | ok |
| reinstalar (mesmo token) | 7 linhas antes, 7 depois: reativou e trocou a plataforma | ok |

## T-3 — envio

```
countPushDevices:  A (2 aparelhos Expo) = 3 · OFF (pushEnabled=false) = 0
                   JUNK (token fcm:) = 0 · NODEV = 0 · os quatro juntos = 3

sink:              {"sent":3,...} com chamadas de rede: 0        (hoje devolve sent:0 — corrigido)
lote 250:          3 chamadas — 100, 100, 50
DeviceNotRegistered (9): {"sent":241,"failed":9,"deactivated":9}
                   2º envio: 241 aparelhos, 3 chamadas, nenhum morto
serviço fora do ar: não lançou — {"sent":0,"failed":3,"error":"..."}
HTTP 500:          não lançou — {"failed":3,"error":"HTTP 500"}
```

## T-4 — painel, escopo de tenant

| cenário | resposta | |
|---|---|---|
| prévia do admin X | `{"patients":4,"devices":3}` | ok |
| X **contando** paciente da Y | `{"patients":0,"devices":0}` | ok |
| X com `?clinicId=<Y>` | idêntico ao próprio — **ignorado** | ok |
| Y com `?clinicId=<X>` | idêntico ao próprio — **ignorado** | ok |
| sem credencial / bearer de paciente | 307 → /login | ok |
| `POST` sem `pushNotify` | `push: null`, nenhuma linha de push | ok |
| `POST` com `pushNotify:true` | `push: {sent:3,...}` e sink barrou | ok |
| X mirando paciente da Y (`selected`) | 400, zero mensagem, zero push | ok |

## T-5 — a garantia dos crons

**Por leitura:** `grep -rni "push" app/api/cron/` devolve 5 linhas, todas `Array.prototype.push`.
`lib/notify-patient.ts` e `lib/broadcast-dispatch.ts`: nenhuma ocorrência.

**Fecho transitivo** dos imports das 16 rotas de cron, com controle positivo para provar que o
algoritmo não está cego:

```
rotas de cron analisadas: 16
RESULTADO: nenhuma alcanca lib/push-send nem lib/push-notify.
--- controle positivo ---
app/api/admin/broadcasts/route.ts            => @/lib/push-send
app/api/admin/patients/[id]/messages/route.ts => @/lib/push-notify -> @/lib/push-send
app/api/appointments/route.ts                 => @/lib/push-notify -> @/lib/push-send
lib/background-jobs.ts                        => nao alcanca push
```

**Por execução, com sink:** `daily-report`, `daily-adherence`, `dispatch-broadcasts` e
`bp-reminders` rodaram e **nenhum** produziu linha de push. (`exercise-reminders` e
`appointment-reminders` devolvem 500 por um bug de enum anterior à 077 — abortam antes de
trabalhar, e para eles vale a prova estática.)

**Gatilho da mensagem, ponta a ponta:** admin → paciente da própria clínica gera push **só** para
ele, com título neutro; admin → paciente de outra clínica dá 404 e nenhum push; paciente com push
desligado recebe a mensagem e **nenhum** push; paciente sem aparelho conclui sem erro.

## Os textos — nenhum dado clínico

Os doze textos de `lib/push-notify.ts` (mais os dois novos de `pushTarefa`) não têm nome,
conteúdo, condição nem data. Usam "terapeuta"/"therapist", nunca "fisioterapeuta". O idioma sai de
`preferredLocale`.

## Fora de escopo, achado no caminho (não corrigido)

1. `app/api/cron/exercise-reminders` → 500: `status: { in: ["ACTIVE","IN_PROGRESS"] }` contra o
   enum `DiagnosisStatus`.
2. `app/api/cron/appointment-reminders` → 500: mesma classe, contra `AppointmentStatus`.
3. `[tenant] DEFAULT_CLINIC_SLUG="qa-075-default" does not match an active clinic` — ruído do
   ambiente local.
4. Assunto de e-mail diz **"BPR Rehab"**, contra a regra de não usar "Rehab".

## O que não foi medido, e por quê

| não medido | por quê |
|---|---|
| T-1 inteira | iPhone com o build novo; `expo-notifications` é nativo |
| T-6 inteira | precisa receber notificação de verdade |
| T-7 lado tela | telas do app. O lado servidor foi medido: `pushEnabled:false` sai da contagem e do envio |
| chegada real e recibo real da Expo | proibido — nada podia ir à `exp.host`. Comportamento medido com recibo simulado |
| prévia e envio na tela do admin | escopo era servidor; o cliente foi **lido** para as falhas #2 e #3 |
| gatilhos de vídeo, consulta e documento ponta a ponta | exigem entidades com dependências fundas; verificados por leitura dos call sites |

## Limpeza

2 clínicas, 8 usuários `qa078-*@x.test`, 257 tokens, 3 broadcasts, ~6 mensagens e 1 tarefa —
todos apagados. Nenhum `db push`, `migrate` ou DDL. `push_device_tokens` voltou a 0 linhas, como
estava antes.
