# T-2: A duração ocupa o horário

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Olhar a agenda e ver o que está ocupado.

## Contexto

O bloco no calendário tem altura fixa. Uma consulta de 60 minutos e uma de 30
ocupam o mesmo espaço, e o horário seguinte **parece livre** quando não está.

Numa agenda, isso não é estética: é a informação principal. Quem marca por cima
de um horário ocupado descobre no dia.

## Passos

1. A altura do bloco sai da duração, sobre a mesma escala das linhas de hora.
2. O bloco começa no minuto certo — 10:38 não é 10:00.
3. Duas consultas no mesmo horário aparecem lado a lado, e não uma escondendo a
   outra.
4. Bloco curto continua legível: o nome não some numa consulta de 15 minutos.
5. O contador de vagas do dia concorda com o que se vê.

## Arquivos afetados
- `app/admin/appointments/page.tsx`
- `__tests__/agenda/a-duracao-ocupa-o-horario.test.ts`

## Critérios de aceite
- [ ] Altura proporcional à duração, medida.
- [ ] Início no minuto certo.
- [ ] Sobreposição visível, sem esconder.
- [ ] Consulta curta continua legível.
- [ ] O contador de vagas não discorda do desenho.
