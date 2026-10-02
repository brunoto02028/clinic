# QA — T-1: O portão único de envio ao paciente

**Veredito:** ✅ aprovado, depois de uma rodada de correções
**Data:** 02/10/2026
**Método:** teste unitário + **mutação**. Tarefa de biblioteca, sem tela —
nenhum Playwright, nenhum dev server.

## A primeira rodada reprovou com ressalvas

O QA rodou 19 mutações contra os 21 testes iniciais. As quatro que a
qa-spec pedia ficaram vermelhas, mas **seis mutações sobreviveram** — e uma
mutação que não derruba nada é um buraco de cobertura, não uma aprovação.

| mutação | antes | depois |
|---|---|---|
| M7 — a mensagem do 429 diz o **teto** em vez de quantos saíram | 0 caem | **1 cai** |
| M11 — `modo: "fila"` deixa de ser reconhecido | 0 caem | **3 caem** |
| M15 — confirmação ausente volta 200 em vez de 400 | 0 caem | **2 caem** |
| M16 — o teto deixa de olhar a janela de 1h | 0 caem | **2 caem** |
| M17 — conta e-mail de qualquer `status`, não só os enviados | 0 caem | **2 caem** |
| M19 — **conta os envios de todos os pacientes no teto deste** | 0 caem | **2 caem** |

A causa era a mesma nas quatro últimas: os dois `count` eram mocados com
valor fixo e **nenhum teste olhava o `where`**. O teto podia estar contando
a coisa errada — inclusive mensagem que foi para outra pessoa — e todos os
testes continuavam verdes.

O M7 tinha causa própria e mais sutil: o teste montava `3 + 2 = 5`,
exatamente o valor de `TETO_POR_HORA`. Com a soma caindo em cima do teto,
"a contagem real" e "o teto" viram a mesma string, e a asserção passa mesmo
se a mensagem disser o número errado. Agora monta `4 + 3 = 7`.

### O M7 também cobrou o preço na hora

Um script de mutação quebrou no meio por codificação do Windows, **depois**
de escrever a mutação M7 e **antes** de restaurar. Eu conferi pelo
`git diff --stat`, vi as mesmas 192 inserções, e concluí que estava limpo —
mas `--stat` conta linhas, não lê o conteúdo.

Quem pegou foi o teste novo do M7, no commit seguinte. Vale registrar como
está: a conferência por contagem de linhas não serve para provar que uma
mutação foi desfeita; serve `md5sum` ou `git diff` de verdade.

## Correções aplicadas

1. **Seis testes novos** (21 → 26), cobrindo cada buraco acima.
2. **`contarEnviosRecentes` ganhou try/catch.** O portão roda **depois** de
   a ação principal estar gravada, então um tropeço do banco na contagem
   virava 500 numa prescrição que já existia — e quem clicou clicaria de
   novo. Agora devolve 0 e registra. É escolha: o teto é proteção contra
   enxurrada, e a confirmação da pessoa, que é a regra de verdade, já
   passou antes.
3. **Os dois `(prisma as any).systemLog` saíram.** O modelo existe no
   schema e é usado sem cast no resto do repositório; o cast jogava fora a
   checagem de `level`, `category` e `details`.

## Estado final

```
$ npx jest __tests__/notifications/o-portao-de-envio-ao-paciente.test.ts
Tests:       26 passed, 26 total

$ npx jest __tests__
Test Suites: 248 passed, 248 total
Tests:       3541 passed, 3541 total
```

Mutações reconferidas uma a uma depois do conserto — as seis que
sobreviviam agora derrubam teste, e o arquivo volta limpo entre cada uma.

## Critérios de aceite

- [x] Chamada sem confirmação é recusada, não ignorada em silêncio.
- [x] `notify: false` e ausente dão o mesmo resultado.
- [x] `hash` que não bate é recusado com 409.
- [x] Acima do teto, 429 **e diz quantos já saíram** — agora provado.
- [x] Toda decisão, inclusive a de barrar, deixa linha com `origem`, canal e
      `patientId`.
- [x] Teste do caminho negativo falha se alguém remover o portão (provado
      por mutação, duas vezes).
- [x] `pediramEnviarAoPaciente` continua sendo a única comparação do modo
      explícito **dentro do portão**.
- [x] As duas rotas que já o usavam continuam funcionando (437/437 em
      `__tests__/agenda`).

## O que este QA **não** cobre

1. **Nenhuma tela.** O que está provado é a função, não o botão.
2. **As quatro medidas da qa-spec** — contagem em `PatientOutboundEmail` e
   `OutboundMessage`, ausência de `[OUTBOUND-SINK]`, ausência de linha
   "passou" — **não foram tiradas**. "Nada saiu" está provado como veredito
   da função, não como silêncio observado no banco.
3. **Nada em produção.** A qa-spec manda repetir os cenários 1, 8 e 19 em
   prod com o paciente de teste. Pendente.
4. **O teto nunca foi exercido de verdade** — zero chamadas consecutivas,
   só `count` mocado. O `where` agora é conferido; o comportamento com
   banco real, não.
5. **A linha de log nunca foi lida de volta.** Se `details: Json` recusar o
   formato em produção, este QA passa igual.
6. **O critério "não chamado em caminho transacional do paciente"** é
   verdadeiro por vacuidade hoje — só vira real na T-4.
7. **A tela do T-7 não existe**, então "o registro é legível por ela" não é
   verificável aqui.

## Achados fora do escopo da T-1

- **Três rotas ainda comparam `=== true` à mão**:
  `app/api/admin/meal-plans/route.ts:140`,
  `app/api/admin/meal-plans/[id]/route.ts:171` e
  `app/api/articles/[id]/route.ts:136`. Todas falham **fechado**, então
  nenhuma é o defeito original — mas não aceitam `"true"` de um corpo
  form-encoded. As duas de `meal-plans` são do aluno/personal: decidir se o
  portão cobre o aluno antes de mexer.
- **`anotarDecisaoDeEnvio` duplica `logSystem`** (`lib/system-logger.ts:48`),
  que já escreve em `SystemLog` e já engole o próprio erro. Vale unificar
  quando a T-7 definir o formato que a tela lê.
