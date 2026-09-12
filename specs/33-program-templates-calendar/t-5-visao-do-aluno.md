# T-5: Visão do aluno agrupada por data (mobile + web)

**Status:** concluído
**Depende de:** T-3

## Objetivo
Aluno com treinos vindos de um programa vê o calendário organizado por data (com destaque pro dia de hoje), sem regredir quem só usa treino recorrente manual (`scheduledDate: null`).

## Contexto
Ver decisão 6 do plan.md. Hoje `app/api/mobile/workouts/route.ts` e a tela web equivalente retornam/mostram todos os `Workout` ativos sem filtro de data; o agrupamento é feito no client via `daysOfWeek`.

## Passos
1. Não alterar o contrato da API (continua retornando todos os `Workout` ativos) — só incluir `scheduledDate`/`templateDayId` no `select`/response (ambos já existem no model, só passar a expor).
2. `mobile/src/api/training.ts` + tela mobile de treino: separar em duas seções — "Recorrente" (sem `scheduledDate`, comportamento atual inalterado) e "Programa" (com `scheduledDate`, agrupado por semana/dia, com "Hoje" destacado).
3. Equivalente na visão web do aluno (`app/dashboard/...` — localizar o componente exato na hora da implementação).

## Arquivos afetados
- `mobile/src/api/training.ts`
- Tela mobile de treino (localizar em `mobile/src/screens` na implementação)
- Tela web equivalente do dashboard do paciente/aluno

## Critérios de aceite
- [ ] Aluno com só treino recorrente (fluxo atual) não vê nenhuma mudança visual.
- [ ] Aluno atribuído a um programa vê os treinos agrupados por data, com "hoje" destacado.
- [ ] Nenhuma regressão no fluxo de log de treino (`WorkoutLog`) existente.
