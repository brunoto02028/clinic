# QA — T-10: confirmar que a assinatura existe

**Data:** 24/09/2026 · **Ambiente:** API em `:4010`, app no alvo Expo Web em `:8085`
**Dados:** prefixo `qa-t10-` e `qa-075-`, removidos ao final (0 sobras)
**Resultado:** ✅ **aprovado**, com um limite declarado: a chamada real à Withings não foi exercida

## O problema, em uma frase

`status: "CONNECTED"` só dizia que o OAuth funcionou. Se a Withings recusasse a assinatura das
notificações, o aparelho ficava autorizado e **mudo** — e a única testemunha era uma linha de log
que ninguém ia abrir. O paciente via "conectado" em verde, a clínica também, e nenhum dado chegava.

## O que passou a existir

Duas colunas em `WearableConnection` (`notifyConfirmedAppli`, `notifyCheckedAt`) e quatro estados,
porque três seriam mentira: **unchecked** (conexão anterior a isto, ninguém perguntou),
**silent** (perguntamos e a Withings não confirmou nada), **partial** (confirmou parte) e
**receiving**. `withingsListSubscriptions` já existia em `lib/withings.ts` e **nunca tinha sido
chamada**; agora é ela que responde.

## A prova

### A regra, isolada — 7 testes (`__tests__/wearables/delivery-state.test.ts`)

Incluindo os dois casos que um engano tornaria invisível: **ordem** em que a Withings lista os
tipos não pode mudar o resultado, e **pressão faltando** tem que dar `partial`, nunca `receiving`
— numa clínica construída em torno da pressão, luz verde com passos chegando seria exatamente a
mentira que este trabalho existe para remover.

### Pela API, com bearer de paciente

```
== O que /api/wearables/connections responde em cada situacao ==
  OK    nunca conferido (conexao antiga)       -> unchecked
  OK    conferido, Withings nao confirmou nada -> silent
  OK    so pressao confirmada                  -> partial
  OK    tudo menos pressao                     -> partial
  OK    os quatro confirmados                  -> receiving

== A rota de reassinar ==
  sem token:               307 (middleware)
  com token do paciente:   200
  sem conexao conectada:   404 no_connection

== Gate de modulo: paciente sem mod_devices ==
  resubscribe:             403 module_not_in_plan
```

O `200` do meio é a prova de que `subscribeAndRecord` **não lança**: a conexão de teste tem token
falso, a chamada à Withings falhou, e o resultado foi registrar "nada confirmado" em vez de
quebrar a rota. É o comportamento que a função promete.

### Na tela, dirigida de verdade

Paciente criado pelo cadastro do app, aparelho semeado como **autorizado e mudo**:

- card em âmbar, não em verde;
- *"Authorised, but not sending measurements yet."*;
- botão **Fix**, que reassina sem refazer o OAuth.

Com os quatro tipos confirmados, o aviso e o botão somem e o card volta ao normal. Zero erros de
console nos dois estados. Evidência em `qa/screenshots/wearable-silencioso.png`.

### No admin

`/api/biohacking/patients` devolve `delivery` por conexão, e a listagem mostra
"N not sending" em âmbar — para a clínica não achar que monitora quem não está sendo monitorado.

## Segunda rodada — o que o code review derrubou

O review achou dois problemas **altos** que invalidavam a entrega como estava. Ambos corrigidos e
reverificados:

**1. As conexões que já existem ficariam mudas e invisíveis para sempre.** `subscribeAndRecord` só
era chamado no callback do OAuth e no botão. Não havia backfill nem cron, e `unchecked` não
aparecia em tela nenhuma — ou seja, exatamente os aparelhos que podem estar mudos hoje continuariam
verdes, e o único jeito de sair disso seria refazer o OAuth. Agora `ensureCheckedSoon` confere em
segundo plano na primeira vez que alguém abre a lista (paciente ou clínica), com estrangulamento de
6 horas para não virar uma chamada por request quando a Withings está fora.

**2. O portal web do paciente continuava mostrando a mentira.** A T-10 tinha sido feita só no app.
`/dashboard/devices` agora mostra o mesmo card âmbar, a mesma frase e o mesmo botão — a regra de
paridade web ↔ app vale aqui como em tudo.

E cinco médios:

| # | O que era | Correção |
|---|---|---|
| 3 | "não conseguimos perguntar" era gravado como "a Withings recusou" | a checagem agora diz quantas perguntas foram respondidas; se **nenhuma**, não grava nada — a conexão continua `unchecked` em vez de ganhar uma data que a faria parecer muda |
| 4 | se o `update` falhasse, o retorno mentia e as telas se contradiziam | devolve `recorded`, e o que não foi perguntado responde **503 `provider_unreachable`** em vez de um 200 alegre |
| 5 | sem rate limit, com amplificação 8× na API da Withings | 5 tentativas por 10 min, por usuário |
| 6 | o aparelho da **clínica** ficou de fora — e é o que alimenta vários pacientes | a caixa de entrada mostra o aviso e o botão; `/admin/biohacking` só varre quem tem papel PATIENT, e a conexão do manguito pertence a quem autorizou |
| 7 | faltar sono e faltar pressão davam a mesma frase | as telas nomeiam a pressão quando é ela que falta |

Mais os menores: o objeto de nulos no callback virou a conexão real (com os nulos, remover o
override um dia faria **toda** conexão nova nascer marcada como muda, em silêncio); `delivery` só
sai para Withings; a resposta de `connections` é montada campo a campo, sem token; e três
comentários que afirmavam o que o código não fazia.

Reprovado e refeito na prova:

```
com token do paciente:   503 provider_unreachable   (antes: 200 enganoso)
os cinco estados:        OK, com "falta pressao" correto em todos
vazamento de token:      nenhum
```

Testes: **410 passando** (3 novos, incluindo "nunca perguntado não é o mesmo que faltando").

### Uma nota de método

A verificação na web falhou três vezes seguidas por **cache do Next dev**, não por código: o
bundle em execução era o anterior à edição, mesmo com `rm -rf .next` e aba nova. O que resolveu foi
subir o dev numa **porta nova**. Está anotado na memória do projeto, porque custou tempo e vai
acontecer de novo.

## O que este QA **não** prova

A conversa real com a Withings — `notify action=subscribe` e `action=list` — **não foi
exercida**, porque exige uma conta Withings e um aparelho, que ainda não existem. O que está
provado é tudo o que acontece com a resposta deles: como é lida, gravada, interpretada e exibida,
incluindo o caso de a chamada falhar.

Isso fecha no primeiro teste real com o BPM Connect. É a primeira coisa a conferir quando a conta
da clínica existir: conectar e ver se o card aparece **receiving** ou **silent**.
