# T-1: O intervalo entre um e outro

**Status:** implementada — aguardando QA
**Depende de:** nenhuma

## Objetivo

Que marcar às 10:00 não signifique estar livre às 11:00 em ponto.

## Contexto

`ocupacao()` usa exatamente a duração da consulta. Uma de 60 minutos às 10:00
libera as 11:00 sem um minuto para o paciente sair, a sala ser arrumada, a
anotação ser feita, ou cinco minutos de atraso serem absorvidos.

O Bruno: *"para nunca marcar e deixar a paciente esperando."*

## Passos

1. `bufferMinutes` no `Clinic`, **padrão 0** — o comportamento de hoje.
2. A ocupação passa a contar `duração + intervalo`. É uma linha em `ocupacao()`,
   e é o coração da tarefa: tudo o mais é consequência.
3. Vale nos dois caminhos — o paciente marcando no app e a clínica marcando no
   painel —, porque os dois consultam a mesma disponibilidade.
4. A marcação manual pode atravessar o intervalo de propósito, pelo mesmo
   `forceTime` que a 106 T-4 criou: a clínica manda, mas por decisão escrita.
5. Testes com os casos que mordem: intervalo zero (nada muda), consulta que
   termina exatamente quando a próxima janela começa, duas consultas seguidas,
   e o último horário do dia — que **não** pode sumir por causa de um intervalo
   que cairia fora do expediente.

## O que esta tarefa **não** faz

Criar registro de consulta para o intervalo. Ele ocupa e aparece na agenda; não
vira uma linha na lista do paciente.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/schedule.ts`
- `lib/availability-day.ts`
- `__tests__/agenda/o-intervalo-entre-um-e-outro.test.ts`

## O que apareceu ao implementar

**O intervalo vale dos dois lados, e isso era meia tarefa a mais.** Eu tinha
escrito "o intervalo vem depois da consulta". Mas se a marcada às 10:00 só
empurra o que vem **depois**, então 09:00–10:00 continua sendo oferecido — e
encosta nela sem folga nenhuma. É o mesmo paciente esperando, do outro lado do
relógio.

A conta é uma só: a marcada ocupa `intervalo + duração + intervalo`. Exigir
`candidato.início >= marcada.fim + intervalo` **ou**
`marcada.início >= candidato.fim + intervalo` é exatamente isso — e uma conta é
melhor que duas regras que podem divergir.

**A duração pedida não entrava na conta.** O candidato era medido pela casa da
grade, então 11:00 parecia livre para uma consulta de 90 minutos que iria até
12:30, em cima da das 12:00. Corrigido junto: era o mesmo defeito de fundo.

**Numa grade de 60 minutos, um intervalo de 15 apaga os dois vizinhos.** Não
existe casa de 10:15 para oferecer no lugar. É duro e é a verdade da grade —
quem quiser recuperar meia hora usa `slotMinutes: 30`, não um intervalo menor.
O teste diz isso em voz alta, porque é o tipo de consequência que se descobre
com a agenda vazia.

## Critérios de aceite
- [x] Com intervalo 0, nenhuma agenda muda.
- [x] Com intervalo 15, a consulta das 10:00 tira as 11:00 **e as 09:00**.
- [x] O último horário do dia não some por causa do intervalo.
- [x] A duração pedida entra na conta.
- [x] Leitura da clínica que falha não derruba a agenda; negativo vira zero.
- [x] Vale para o app e para o painel — os dois consultam a mesma função.
- [x] A clínica atravessa de propósito pelo `forceTime` da 106 T-4.
- [ ] QA com intervalo de verdade configurado.
