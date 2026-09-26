# T-3: Calendário do paciente — dia, semana e mês

**Status:** pendente
**Depende de:** T-2

## Objetivo
Trocar a tira reta de 14 dias por um calendário com três alturas, que mostra **onde tem vaga** antes
de a pessoa tocar.

## Contexto
> "Queria ver um calendário semanal, pelo menos, e poder rolar para o lado... diário, semanal ou até
> mensal." — Bruno

Hoje a pessoa descobre se o dia tem vaga tocando nele. Com a T-2 a tela sabe antes.

A **semana abre por padrão**: quem marca consulta pensa em "esta semana ou a próxima". O mês serve
para saltar longe; o dia, para ver as horas.

## Passos
1. Componente de calendário no app, com os três modos e troca por `SegmentedControl`.
2. Semana: sete colunas, arrastar para o lado troca de semana.
3. Mês: grade, cada dia com marca de disponibilidade.
4. Dia: o que já existe — a lista de horários.
5. Cada dia recebe uma marca: livre, pouca vaga, cheio, fechado. Fechado não é tocável.
6. Estados: carregando, erro, e "a clínica não configurou agenda".
7. O fuso continua sendo o da clínica — o defeito de `toISOString()` que mandava a marcação para o
   dia errado não pode voltar.

## Arquivos afetados
- `mobile/src/components/CalendarioDeAgenda.tsx` (novo)
- `mobile/app/(app)/(clinica)/book-appointment.tsx`
- `mobile/src/api/booking.ts`
- `__tests__/agenda/calendario-do-paciente.test.ts` (novo)

## Critérios de aceite
- [ ] Abre na semana
- [ ] Arrastar para o lado troca a semana
- [ ] Mês mostra a grade com marca por dia
- [ ] Dia fechado não é tocável e diz por quê
- [ ] Escolher um dia mostra os horários daquele dia
- [ ] A data escolhida é a que o servidor recebe, no fuso da clínica
- [ ] Funciona nos dois tons
