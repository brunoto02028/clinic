# QA Report — T-8: A página de saúde — o dia, a noite, e o período

**Data:** 01/10/2026
**Resultado da primeira rodada:** ❌ **reprovou no critério 4** (palavra proibida na tela do paciente); 7 pontos passaram, com 5 ressalvas
**Resultado depois das correções:** ✅ a reprovação e as cinco ressalvas fechadas, cada uma com teste

> **Nenhum dado de paciente real foi tocado.** Nenhum login, nenhum servidor de
> desenvolvimento, nenhum build local. A tela é React Native: não existe forma
> de a abrir por navegador, e por isso **não há screenshots** — todo cenário que
> precisa do app está marcado **não executado**, nunca "passou".

## Resumo da primeira rodada

| # | O que verificar | Resultado |
|---|---|---|
| 1 | `npx jest __tests__/wearables/` passa | ✅ 300 testes, 24 suites |
| 2 | `npx tsc --noEmit` na raiz e em `mobile/` | ✅ zero erros nos dois |
| 3 | Nenhuma cor de julgamento na tela do paciente | ✅ (a exceção do ECG é a única) |
| 4 | Nenhuma palavra proibida | ❌ `wearable-data.tsx:501` — *"Ritmo normal"* |
| 5 | EN e PT em todo texto novo | ✅ |
| 6 | `ODiaEANoite.tsx` importa as contas, não copia | ✅ |
| 7 | A rota: sessão, `bucketMinutes`, razão do vazio, 500 | ✅ por leitura — ⚠️ zero cobertura de teste |
| 8 | Deploy de `42aa55d3e` terminou | ✅ `finished` 21:50:30Z, schema `in sync` |

Os cenários da qa-spec: 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 8.9 e 8.12 ✅ por teste ou
código; 8.10 ❌; 8.11 parcial; 8.1, 8.6 (visual) e 8.13 **não executados** — tela
React Native, sem navegador.

## O que o QA achou, e o que foi feito

### ❌ F1 — "Ritmo normal" na tela do paciente — corrigido

`wearable-data.tsx:501` renderizava `"Normal rhythm"` / `"Ritmo normal"`. A
conclusão é do aparelho, mas a regra 4 da tarefa é categórica sobre
**vocabulário**: *"Nem 'normal', nem 'alterado', nem 'preocupante'"*. A linha
veio da T-1 (`d7fc9454b`), não da T-8 — mas está na tela, e a tela é a mesma.

*Feito:* a frase passou a ser **"O relógio não assinalou nada"** / *"The watch
flagged nothing"*. Dizer o que o aparelho **não assinalou** é relato; dizer que
está "normal" é nota.

### ⚠️ R1 — Produção estava um commit atrás — corrigido pelo merge

`881230da5` (a escala do gráfico e a chave de data local) estava na branch e
**não em `main`**. Os dois defeitos que ele conserta estavam vivos em produção.
*Feito:* este ciclo merge-a junto com as correções abaixo.

### ⚠️ R2 — O rodapé dizia "Last 7 days" com 30 selecionados — corrigido

A janela é estado, com 30 por omissão; a tela abria a mostrar 30 e a dizer 7.
Não é cosmética: é uma afirmação falsa sobre o período, na tela que a pessoa lê
sozinha. *Feito:* o rodapé lê a janela.

### ⚠️ R3 — A razão do vazio não chegava a ninguém — corrigido

A rota calculava `no_series_for_day` vs `no_connection` e nenhuma tela lia.
*Feito:* com aparelho ligado e sem série do dia, a tela diz *"O hora a hora do
dia ainda não chegou. Vem com a próxima sincronização."* — em vez de esconder
o cartão e deixar a pessoa sem saber se é o relógio, o plano, ou nós.

### ⚠️ R4 — O critério "a tela diz de que aparelho veio" foi trocado, não cumprido — corrigido

Na lista do "Implementado" eu marquei *"a tela diz a resolução em que
desenha"* no lugar do critério original. O QA viu a troca. *Feito:* os cartões
do dia e da noite passam a dizer **"do seu Withings"** ao lado da data — a rota
já devolvia o `provider`; a tela é que não o usava.

### ⚠️ R5 — Os testes da escala liam o código como texto — corrigido

Dois testes fixavam a grafia do fonte (`minBarra`). Renomear quebrava o teste
sem quebrar nada; reescrever a conta de outra forma errada passava verde.
*Feito:* a escala saiu para o módulo (`escalaDasBarras`, `alturaDaBarra`) e o
teste passou a ser de comportamento — **um pico isolado de cinco minutos não
aperta as barras no meio**, com a aritmética asseverada (`escala.max` é a
média 80, não o pico 140).

O teste do fuso continua a ler o código, com a razão dita: o jest corre em UTC,
onde as duas versões coincidem. O QA aceitou essa; eu também.

### ⚠️ Zero cobertura na rota — corrigido

`__tests__/wearables/a-rota-das-series.test.ts`, com o padrão de `prisma`
mockado que o repo já usa: 401 sem utilizador e sem tocar no banco; o gate
decide antes da rota; `bucketMinutes` = 5 e 1440 pontos viram 288; a consulta é
do próprio utilizador; o hipnograma vai inteiro; `no_series_for_day` vs
`no_connection`; aparelho desligado não conta; série ilegível é **500**; `kind`
desconhecido é 400 com a lista.

### Fora do escopo da T-8, da mesma família — **avisado, não consertado**

`mobile/app/(app)/(clinica)/blood-pressure.tsx:92` tem um crachá **"NORMAL"**
em cor de ok, na tela do paciente. É exatamente a classe de coisa que a T-2 e a
T-8 tiraram da tela do wearable. Decisão do Bruno; está na lista.

## O que continua não executado

| cenário | porquê |
|---|---|
| 8.1, 8.6 (visual), 8.13 | tela React Native; sem app a correr, sem medição |
| métricas novas da T-7 na tela | nenhuma é renderizada ainda — coerente com a caixa desmarcada na tarefa, e com a medição do plano ainda em aberto |
| `qa/screenshots/` | vazio — a evidência visual só existe no telemóvel, depois do `eas update` |
