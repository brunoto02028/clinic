# T-2: Disponibilidade por intervalo

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
`/api/availability` passa a responder por intervalo (`?from=&to=`), devolvendo por dia quantos
horários estão livres — sem mudar em nada a resposta de um dia.

## Contexto
A tela não pode pintar "livre/cheio" sem 14 chamadas, e um mês exigiria 31. A rota precisa mudar
antes de o calendário poder ter forma.

A regra de um dia é densa: bloqueio de terapeuta, agenda configurada, exceção do dia, modelo antigo
como fallback, horários ocupados, horários que já passaram hoje. Duplicá-la criaria duas verdades
que divergem na primeira correção.

## Passos
1. Extrair a regra de um dia de `app/api/availability/route.ts` para `lib/availability-day.ts`,
   numa função que recebe clínica, terapeuta, data e opções e devolve o mesmo que a rota hoje.
2. A rota de um dia passa a chamar essa função. **A resposta não muda** — nem um campo.
3. Modo intervalo: `?from=&to=` (máximo 42 dias), `Promise.all` por dia, resposta
   `{ dias: [{ data, livres, fechado, motivo }] }`.
4. Recusar intervalo invertido, maior que o limite, ou com data malformada — com mensagem, não 500.
5. Testes: a resposta de um dia é idêntica à de antes; o intervalo conta certo; os limites recusam.

## Arquivos afetados
- `lib/availability-day.ts` (novo)
- `app/api/availability/route.ts`
- `__tests__/agenda/disponibilidade-intervalo.test.ts` (novo)

## Critérios de aceite
- [ ] A resposta de `?date=` é byte a byte a de antes (campo a campo)
- [ ] `?from=&to=` devolve um item por dia do intervalo
- [ ] Dia fechado vem com o motivo (`blocked`, `closed`, `not_working`)
- [ ] Intervalo acima de 42 dias é recusado com 400
- [ ] `from` depois de `to` é recusado com 400
- [ ] Data malformada é recusada com 400, não 500
