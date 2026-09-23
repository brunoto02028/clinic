# T-5: `AutomationRun` — idempotência e log unificados

**Status:** pendente
**Depende de:** T-3

## Objetivo

Um registro único de "esta regra já rodou para este paciente nesta janela", para que nenhuma
automação produza a mesma coisa duas vezes — e um log que permita responder "por que este paciente
recebeu isto?".

## Contexto

Documento §3.6. Hoje a idempotência existe **por job**: `generatePendingEvidenceReports` faz claim
condicional por `attempts`, o `daily-adherence` tem a própria lógica. Cada automação nova reinventa
a proteção, e uma que esquecer manda duas vezes.

## Passos

1. Modelo `AutomationRun`: `idempotencyKey` único (`ruleCode:patientId:janela`), `ruleCode`,
   `patientId`, `clinicId`, `result`, `details Json`, `createdAt`.
2. `lib/automation/run.ts`: `runOnce(key, fn)` — grava a chave numa transação antes de executar;
   chave repetida devolve o resultado anterior sem executar de novo.
3. Aplicar em `daily-adherence` (T-3) e em `createAlert` (T-2), substituindo as proteções ad-hoc.
4. Expor o histórico na ficha do paciente: que regra rodou, quando, com que resultado.

## Arquivos afetados

- `prisma/schema.prisma` (só adição)
- `lib/automation/run.ts`, `lib/automation/run.test.ts` (novos)
- `app/api/cron/daily-adherence/route.ts`, `lib/alerts.ts` (passam a usar `runOnce`)

## Critérios de aceite

- [ ] `prisma migrate diff` **não contém `DROP`**
- [ ] Rodar a mesma regra duas vezes na mesma janela produz **um** efeito, provado por teste
- [ ] Duas execuções concorrentes (corrida) produzem um efeito só — teste com `Promise.all`
- [ ] Janela diferente produz efeito novo
- [ ] O histórico aparece na ficha do paciente e diz qual dado fez a regra disparar
