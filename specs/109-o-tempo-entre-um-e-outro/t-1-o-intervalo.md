# T-1: O intervalo entre um e outro

**Status:** pendente
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

## Critérios de aceite
- [ ] Com intervalo 0, nenhuma agenda muda.
- [ ] Com intervalo 15, uma consulta de 60 às 10:00 tira as 11:00 da oferta.
- [ ] O último horário do dia não some por causa do intervalo.
- [ ] Vale para o app e para o painel.
- [ ] A clínica consegue atravessar de propósito, e isso fica registrado.
