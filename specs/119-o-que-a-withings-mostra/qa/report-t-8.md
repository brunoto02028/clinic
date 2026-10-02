# QA Report — T-8: Puxar a tela fala com a Withings, não só com o nosso banco

**Data:** 02/10/2026
**Rodada 1:** ❌ reprovado — 8 aprovados, 5 reprovados, 5 com ressalva (commit `caea79de1`)
**Rodada 2 (após correções):** ✅ aprovado — os 5 reprovados fechados, 3 das 5 ressalvas também

> A rodada 1 foi corrida pelo agente **qa-tester** contra um servidor local na
> porta **4119** (a :4000 é servida pelo checkout `Documents\clinic`, confirmado
> por PID), com `DATABASE_URL` em localhost verificado e quatro pacientes de teste
> criados para isto. **Nenhum paciente real tocado.**
>
> Não há screenshots: a tela é React Native e não corre em navegador. O que foi
> medido é a regra (testes + mutação), a rota (curl), o payload real do servidor
> passado pelas funções reais, e a semântica do React Query 5.101.0 — a versão
> que o app embarca, não a 5.0.0 da raiz.

## Os dois que decidiram o veredicto

### F2 ❌ → ✅ — `NEEDS_REAUTH` não existe neste código

**O defeito que apagava a tarefa inteira.**

O schema diz, na própria coluna: `status String @default("CONNECTED") //
CONNECTED | DISCONNECTED | ERROR`. A palavra `NEEDS_REAUTH` aparecia em **dois**
sítios no repositório inteiro — o ficheiro novo e o seu teste. Eu tinha inferido
o nome da mensagem de erro da própria rota (*"Withings connection needs to be
reauthorised"*).

O efeito, medido:

```
qa119.t8.erro | status=ERROR | lastSyncedAt=2026-10-02T06:36:42.429Z | lastSyncError=null
valeASincronizacao = true
```

**`true` para sempre.** O `lastSyncedAt` só é escrito quando a ingestão termina
bem, portanto numa falha ele congela, a idade nunca cresce, e o tecto de 2
minutos — a decisão central da tarefa, a razão de o ficheiro existir — deixava de
ter efeito a partir da **primeira falha**, naquele paciente, até alguém
reconectar.

O que salvava a Withings era um acidente: a rota procura a ligação com
`status: 'CONNECTED'`, logo respondia 404 sem falar com ninguém. Ficava um POST
por cada entrada na aba e por cada gesto, para sempre, com a roda a girar pela
ida e volta.

E dois testes meus fixavam esse estado e **morriam sob mutação a defendê-lo** —
o caso exacto de *"todo mock tem de ser um estado que o banco produza"*.

**Correção, em duas partes:**

1. `PODE_PEDIR = new Set(["CONNECTED"])` — uma lista do que **serve**, não do
   que não serve. Um estado novo entra como "não serve" sozinho.
2. **O relógio passou a ser o nosso**: *quando foi a última vez que pedimos*.
   Esse avança mesmo quando a sincronização falha, que é exactamente quando o
   tecto tem de apertar. O `lastSyncedAt` continua a contar — se o servidor
   acabou de sincronizar, não há nada a pedir — mas deixou de ser o único.

   Vive num `useRef`, e morre quando a app fecha. É aceitável: reabrir a app é o
   momento em que se quer os números frescos, e o `lastSyncedAt` cobre esse caso
   sozinho.

### F1 ❌ → ✅ — a pendência que justifica não mostrar erro não existia

O critério de aceite dizia *"uma falha da Withings não produz alerta novo — a
pendência existente basta"*. A primeira metade passava. **A segunda era falsa**,
e a cadeia inteira estava medida:

1. a rota de sync escrevia `status: 'ERROR'` e **nunca** `lastSyncError`;
2. `/api/wearables/connections` **não selecionava nem devolvia** `lastSyncError`
   — o admin e o cron liam-no, o paciente não;
3. `pendencias()` só produz `falha_na_sincronizacao` quando esse campo tem
   conteúdo.

```
payload real, com a ligação em ERROR depois de um 502 da Withings:
  [{"provider":"WITHINGS","status":"ERROR","lastSyncedAt":"...","lastSyncError":"<ausente>"}]
pendencias = []
```

A frase *"A última sincronização falhou: …"* existe na tela desde sempre e era
**inalcançável** — tal como `autorizacao_expirada`, que lê o mesmo campo.

**O que a paciente via:** puxa a tela, a roda gira, a roda para, os números são os
mesmos de três horas antes, e nada diz porquê. É a ausência silenciosa outra vez,
e desta vez a justificação para não mostrar um alerta era precisamente a frase
que não existia.

**Correção:** a rota de sync grava `lastSyncError` e `lastSyncErrorAt` na falha, e
**limpa-os** quando uma sincronização volta a correr bem — senão uma falha de há
três semanas ficaria a acusar por cima de dados chegados esta manhã. A rota das
ligações passou a devolver os dois campos.

### F3 ❌ → ✅ — a rota não tinha guarda de concorrência

Seis POSTs no mesmo instante, mesmo paciente:

```
total da rajada: 508ms
  #1 HTTP 502  #2 HTTP 404  #3 HTTP 502  #4 HTTP 502  #5 HTTP 502  #6 HTTP 502
resumo: {"404":1,"502":5}
```

**Cinco das seis entraram no ingest e falaram com a `wbsapi.withings.net` cada
uma por si** — cerca de **65 chamadas num segundo**, de **uma** pessoa, contra um
tecto publicado de 120/min partilhado por todos os pacientes. A sexta só levou
404 porque a primeira já tinha virado o `status` para `ERROR`: serialização
acidental, e só no caminho de falha.

Até aqui o único tecto estava no cliente — e **um tecto que vive no cliente não é
um tecto**: basta uma app desactualizada, dois aparelhos da mesma pessoa, ou um
toque duplo que o React não agrupe.

**Correção:** um `Set` de ligações com sincronização em curso, no processo, com
`finally` a limpar. O segundo pedido recebe **409 `already_running`** em vez de
entrar no ingest.

**Dito de propósito:** serve o caso real (pedidos do mesmo paciente a chegar ao
mesmo contentor em segundos) e **não** serve vários contentores. Para esse seria
preciso uma coluna `syncInFlightAt`. Um `Set` honesto é melhor do que uma coluna
cuja necessidade eu ainda não provei.

### F4 ❌ → ✅ — 500 sem corpo para pedido malformado

```
{}             -> HTTP 500, corpo vazio
'nao e json'   -> HTTP 500, corpo vazio
```

`await request.json()` sem `.catch()`, e `provider.toUpperCase()` sobre
`undefined`. Pré-existente — mas a rota deixou de ser um botão raro e passou a
ser chamada por conta própria. Agora **400 `provider is required`**.

### F6 ❌ → ✅ — `setASincronizar(false)` depois de um `await` dentro do `finally`

Medido contra `query-core` **5.101.0**:

```
B1 refetch() rejeitou? false | isError=true      <- hoje resolve, a roda para
B3 o finally propagou: refetch rejeitou
B3 setASincronizar(false) correu? false          <- se um dia rejeitar
```

Hoje funciona — por uma garantia da biblioteca que o código não pedia, e que um
`refetch({ throwOnError: true })` perderia. A roda agora pára **antes** do
`await`, e o `relerTudo()` tem o seu próprio `.catch`.

### F7 ❌ → ✅ — `metas.refetch()` só num dos caminhos

Quem puxava e sincronizava não via metas novas. Os dois caminhos passam pela
mesma função.

### F8 ⚠️ → ✅ — a guarda `if (aSincronizar)` não era quem travava

O QA mostrou que ela lê o `aSincronizar` do render em que `ligacoes.data` mudou,
não o actual — quem travava era a partilha estrutural do React Query mais o
tecto. A guarda parecia ser a protecção e não era.

Passou a `useRef`, que é lido no instante da chamada.

## O que o QA mediu e não precisou de correcção

| | |
|---|---|
| **Não há laço descontrolado** | 1 chamada por entrada na aba, **0** com o tecto fechado. A partilha estrutural do React Query mantém a referência de `data` quando o payload é igual — medido: `A1 payload IGUAL -> mesma referência? true` |
| **Sem token / token inválido** | 401 nos dois |
| **Sem ligação nenhuma** | `valeASincronizacao = false`, e o servidor responde 404 para o caso de o cliente estar desactualizado |
| **O limitador da casa** | 60/min por IP; primeiro 429 no pedido #61, com `Retry-After: 120`. Com o tecto a funcionar é inalcançável |

## Prova por mutação

Rodada 1: **8 de 9**, com um sobrevivente que era código redundante (removido).
Mas, como o próprio relatório notou, *"M3 morreu num teste que fixa um `status`
que o banco não produz"* — a suíte era forte sobre a regra **como estava
escrita**, e a regra estava escrita contra o estado errado.

Rodada 2, com a regra corrigida: **11 mutações, 11 mortas, nenhuma sobreviveu.**

| Mutação | |
|---|---|
| sem tecto do servidor | ✝ |
| tecto invertido | ✝ |
| a primeira ligação em vez da mais recente | ✝ |
| o carimbo no futuro vira sincronização | ✝ |
| sem ligação utilizável, tenta | ✝ |
| **`ERROR` volta a servir** | ✝ |
| **lista do que NÃO serve** (um estado novo passa) | ✝ |
| nunca sincronizada não vale | ✝ |
| **o nosso pedido é ignorado** | ✝ |
| **só o nosso pedido conta** (o do servidor deixa de contar) | ✝ |
| provider ignorado | ✝ |

## Gates

```
Test Suites: 246 passed, 246 total
Tests:       3523 passed, 3523 total

npx tsc --noEmit            (raiz)    exit 0
npx tsc --noEmit            (mobile/) exit 0
NEXT_DIST_DIR=.build-verify next build exit 0
```

**O build não prova que compila** — `next.config.js` tem `ignoreBuildErrors: true`
e o próprio log diz *"Skipping validation of types"*. Quem prova são os dois
`tsc`, e os dois estão limpos.

## O que fica aberto

| | |
|---|---|
| **A tela num aparelho** | A roda a girar (incluindo a que aparece sozinha ao entrar na aba), os números a mudar depois da sincronização, e a pendência de falha vista com os olhos. Pede emulador ou o telemóvel do Bruno, depois do `eas update` |
| **O caminho de sucesso da rota** | São ~13 chamadas sequenciais à API deles, e é agora o que corre ao entrar na aba. Não há credencial Withings válida no ambiente local; mede-se em produção com o paciente de teste identificado |
| **O 429 continua silencioso** | O `catch` vazio torna 429, 404, 502 e sucesso-sem-dado a mesma experiência. Com a pendência de falha agora a funcionar, o 502 deixou de ser mudo; o 429 e o 404 ainda são. Não é regressão — é o próximo degrau |

## Nota de ambiente

Durante a rodada 1, outra frente estava a trabalhar no mesmo worktree
(`app/api/patient/reports/route.ts`, `prisma/schema.prisma`, `lib/relatorio-a-pedido.ts`
— a 118 T-5). Os gates da rodada 1 correram sobre o estado do worktree naquele
momento, não sobre o `caea79de1` puro. Os da rodada 2 correram sobre a árvore
inteira, com as duas frentes dentro.
