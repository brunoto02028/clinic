# T-4: A tela vazia que não explica

**Status:** pendente
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
