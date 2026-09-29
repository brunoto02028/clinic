# T-3: O app não diz "Confirmada" para o que passou

**Status:** implementada — aguardando QA
**Depende de:** nenhuma

## Objetivo

O paciente abre o app e não lê "Confirmada" sobre uma consulta de três dias
atrás.

## Contexto

`getStatusStyles` traduz o status do banco e nada mais. Como ninguém fecha o que
venceu, `CONFIRMED` sobrevive à consulta e o app o repete fielmente.

O app **não** deve decidir que faltou — ninguém decidiu. O estado honesto é um
terceiro: *aguardando a clínica*.

## Passos

1. Uma função só, ao lado de `statusStyle`: se a consulta venceu e o status
   ainda é aberto, o rótulo vira "Awaiting the clinic" / "Aguardando a clínica",
   em tom neutro — nem verde de confirmado, nem vermelho de falta.
2. Aplicar nas duas telas — lista e detalhe — pelo mesmo helper. Duas cópias já
   divergiram uma vez, e o comentário do arquivo conta essa história.
3. A consulta vencida some de "próxima sessão" na home.
4. Nada de botão de entrar no vídeo numa consulta vencida.

## Como ficou

`venceuSemDesfecho()` e um quarto parâmetro opcional em `statusStyle()`. A
consulta vence no **fim da janela** — horário + duração + a mesma folga de 30
minutos do servidor —, e aí o rótulo vira *"Awaiting the clinic"* /
*"Aguardando a clínica"*, em cinza: nem o verde de confirmado, nem o vermelho
de falta. O app **não** diz que a pessoa faltou, porque ninguém decidiu isso.

Os passos 3 e 4 já estavam feitos e eu conferi em vez de refazer: `nextUpcoming`
só devolve consulta futura, e o botão de vídeo em consulta vencida caiu com a
T-5 (`aindaNaoFechou`). O teste guarda os dois.

### O que apareceu no caminho

O teste não conseguia importar o módulo do aplicativo: o `@/` significa
`mobile/src/` no app e a raiz do repositório na web, e **o transformador
resolve o atalho antes de qualquer configuração de teste ver** — mapear no
`jest.config.js` não adianta. Tentei e desfiz.

O que resolve é escrever o caminho: três imports dentro de `mobile/src` viraram
relativos. E `statusStyle` deixou de pedir o tema inteiro (`ReturnType<typeof
useTheme>`) para pedir só as oito cores que usa — antes, medir um **rótulo**
exigia montar a árvore de tema inteira, com loja de estado junto.

## Arquivos afetados
- `mobile/src/lib/appointment-status.ts`
- `mobile/src/lib/i18n.ts` (import relativo)
- `mobile/src/api/client.ts` (imports relativos)
- `mobile/app/(app)/(clinica)/(tabs)/appointments.tsx`
- `mobile/app/(app)/(clinica)/appointment/[id].tsx`
- `__tests__/mobile/a-consulta-vencida-no-app.test.ts` (novo, 20 casos)

`(tabs)/index.tsx` não precisou de mudança.

## Critérios de aceite
- [x] Consulta vencida e aberta mostra "aguardando", nas duas telas.
- [x] `COMPLETED`, `CANCELLED` e `NO_SHOW` continuam como estão.
- [x] A home não anuncia consulta que já passou (já era assim; agora medido).
- [x] Um único helper decide, e o teste prova que as telas não têm cópia.
- [x] A folga do app é a mesma do servidor — o teste compara as duas.
- [ ] QA no aplicativo, com uma consulta vencida de verdade.
