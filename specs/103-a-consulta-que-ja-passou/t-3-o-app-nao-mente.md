# T-3: O app não diz "Confirmada" para o que passou

**Status:** pendente
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

## Arquivos afetados
- `mobile/src/lib/appointment-status.ts`
- `mobile/app/(app)/(clinica)/(tabs)/appointments.tsx`
- `mobile/app/(app)/(clinica)/appointment/[id].tsx`
- `mobile/app/(app)/(clinica)/(tabs)/index.tsx`
- `__tests__/mobile/a-consulta-vencida-no-app.test.ts`

## Critérios de aceite
- [ ] Consulta vencida e aberta mostra "aguardando", nas duas telas.
- [ ] `COMPLETED`, `CANCELLED` e `NO_SHOW` continuam como estão.
- [ ] A home não anuncia consulta que já passou.
- [ ] Um único helper decide, e o teste prova que as telas não têm cópia.
