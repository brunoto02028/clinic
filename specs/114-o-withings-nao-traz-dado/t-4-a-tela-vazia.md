# T-4: A tela vazia que não explica

**Status:** implementada (30/09) — QA pendente
**Depende de:** T-1

## Objetivo

Que *View my data* nunca seja uma tela em branco.

## Contexto

Hoje ela mostra **"Last 7 days"** e nada embaixo. O paciente não tem como saber
se é porque não há dado, porque a conexão caiu, ou porque o app não conseguiu
ler.

Três causas, uma tela. É o mesmo defeito que custou três tentativas no
`version.json`: **uma mensagem só para causas diferentes transforma diagnóstico
em palpite** — e aqui quem fica adivinhando é o paciente.

## Passos

1. Distinguir os três estados: sem conexão; conectado e sem dado no período;
   falha ao ler.
2. Onde não há dado no período mas há antes, dizer **quando foi o último**. É a
   informação que o Bruno teria querido: o dado parou em 24/09.
3. Onde a conexão caiu, levar à reconexão.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/wearable-data.tsx`

## Critérios de aceite

- [ ] Nenhum dos três estados cai em tela branca
- [ ] "Sem dado nos 7 dias" diz quando foi o último
- [ ] Conexão caída leva à reconexão
- [ ] **Com dado, a tela mostra** — o controle que impede o texto novo de virar
      desculpa para uma tela que continua não mostrando nada

---

## O que foi feito

A causa veio da [T-1](qa/report-t-1.md), e nao de um palpite: aquela tela le
`WearableDataPoint` — sono, atividade, recuperacao —, a pressao vai para
`BloodPressureReading` por outro caminho, e um BPM Connect e uma bracadeira.

**A tela estava certa ao mostrar nada. Errado era o texto.**

Dizia *"conecte um wearable e aguarde a sincronizacao"*, que e falso duas vezes
para quem ja ligou: ele ja conectou, e esperar nao vai trazer nada. Foi essa
frase que fez o Bruno concluir que a ligacao estava partida.

Agora a tela pergunta se **ha** ligacao antes de aconselhar:

| situacao | o que diz |
|---|---|
| nenhuma ligacao | *conecte um aparelho e aguarde* — continua certo |
| ha ligacao | *esta tela mostra sono, atividade e recuperacao — um medidor de pressao nao envia isso*, com o caminho para **Ver minha pressao arterial** |

O dado dele existe, chegou, e esta a dois toques. A tela passou a dizer isso.

## Provas, e uma mutacao que nao matou

`__tests__/wearables/o-vazio-diz-porque-esta-vazio.test.ts`.

A mutacao foi fixar `temLigacao = false` — e **a primeira versao do teste passou
incolume**, porque ele so procurava a palavra `temLigacao` no arquivo e os
textos continuavam la. Um teste que le codigo como texto tem de fixar a
**ligacao** entre as partes, e nao a presenca delas. Passou a exigir que
`temLigacao` saia mesmo de `ligacoes`, e ai a mutacao morre.

## Criterios de aceite

- [x] O vazio diz **porque** esta vazio
- [x] Nao manda conectar quem ja conectou
- [x] Aponta onde o dado dele esta
- [x] Quem nunca ligou nada continua a receber o conselho certo
- [ ] QA na tela, nas duas linguas
