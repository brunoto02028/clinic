# T-3: Despesa recorrente gera a entrada do mês sozinha

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

`isRecurring`/`recurringDay` (já existem no schema, gravados pela UI, mas
sem nenhuma automação por trás) passam a gerar a entrada do mês
automaticamente — hoje o staff teria que recriar manualmente todo mês.

## Contexto

Mesmo padrão de `app/api/cron/membership-invoices/route.ts`
(`lastInvoicedAt` decide se já gerou este período).

## Passos

1. `prisma/schema.prisma` — `FinancialEntry` ganha
   `lastGeneratedAt DateTime?` (só usado na entrada "modelo",
   `isRecurring: true`).
2. `app/api/cron/finance-recurring-entries/route.ts` (novo) — mesmo
   padrão `?key=` dos outros crons. Busca `FinancialEntry` com
   `isRecurring: true`, filtra as que `recurringDay` bate com o dia de
   hoje E cujo `lastGeneratedAt` (se houver) não é do mês corrente. Pra
   cada uma: cria uma cópia (`type`, `description`, `amount`, `currency`,
   `incomeCategory`/`expenseCategory`, `clinicId`, `patientId`/
   `patientName`/`supplierName` copiados; `status: PENDING`;
   `dueDate: hoje`; `isRecurring: false` na cópia — só o modelo continua
   `true`), depois atualiza `lastGeneratedAt` na entrada modelo pra hoje.
3. Sem envio de nada pra ninguém — só cria a entrada `PENDING`, staff
   marca como paga manualmente quando de fato pagar.

## Arquivos afetados

- `prisma/schema.prisma`
- `app/api/cron/finance-recurring-entries/route.ts` (novo)

## Critérios de aceite

- [ ] Entrada `isRecurring: true` com `recurringDay: 5` gera uma cópia
      `PENDING` todo dia 5, uma vez só por mês (rodar o cron 2x no mesmo
      dia não duplica).
- [ ] Entrada não-recorrente nunca é tocada pelo cron.
- [ ] `?key=` errado → 401.
- [ ] Tenant: só gera pra clínicas com a entrada modelo, sem vazar entre
      clínicas.
