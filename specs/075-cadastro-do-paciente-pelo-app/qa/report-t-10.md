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

## O que este QA **não** prova

A conversa real com a Withings — `notify action=subscribe` e `action=list` — **não foi
exercida**, porque exige uma conta Withings e um aparelho, que ainda não existem. O que está
provado é tudo o que acontece com a resposta deles: como é lida, gravada, interpretada e exibida,
incluindo o caso de a chamada falhar.

Isso fecha no primeiro teste real com o BPM Connect. É a primeira coisa a conferir quando a conta
da clínica existir: conectar e ver se o card aparece **receiving** ou **silent**.
