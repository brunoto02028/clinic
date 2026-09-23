# QA Spec — Atividade 073: Melhorias no Finance

## T-1: Fatura paga gera FinancialEntry

**API**
1. `PATCH /api/admin/invoices/[id]` com `markPaid: true` numa fatura SENT
   → `FinancialEntry` criado (INCOME, PAID, valor/categoria corretos),
   `PatientInvoice.financialEntryId` preenchido.
2. Fatura gerada por agendamento com `Payment.status: SUCCEEDED` (nasce
   PAID automático) → `FinancialEntry` criado na mesma hora, com
   `stripePaymentIntentId` igual ao do `Payment` original.
3. Categoria inferida certa: fatura com `appointmentId` → CONSULTATION;
   com `patientSubscriptionId` → MEMBERSHIP; avulsa → OTHER_INCOME.
4. Dashboard reflete o valor imediatamente após qualquer um dos 2 acima
   (sem precisar de sync do Stripe nem refresh manual de nada).
5. **Tenant:** `FinancialEntry` criado sempre com o `clinicId` da fatura,
   nunca vaza pra outra clínica no Dashboard.

## T-2: Sync do Stripe via cron

**API**
6. Botão manual "Sync Stripe" continua funcionando (mesma resposta de
   antes da refatoração).
7. `POST /api/cron/finance-stripe-sync?key=ERRADO` → 401.
8. `POST /api/cron/finance-stripe-sync?key=CERTO` → roda o sync, sem
   sessão.
9. Rodar 2x seguidas (manual + cron, ou cron 2x) não duplica
   `FinancialEntry` (dedupe por `stripeChargeId`/`stripePaymentIntentId`
   preservado).
10. Cobrança já registrada via T-1 (fatura Stripe-paga) não é duplicada
    quando o sync do Stripe depois vê a mesma cobrança (dedupe cruzado).

## T-3: Despesa recorrente automática

**API**
11. Entrada fixture `isRecurring: true`, `recurringDay` = dia de hoje →
    rodar o cron cria uma cópia `PENDING` com os dados certos.
12. Rodar o cron 2x no mesmo dia → só 1 cópia criada (idempotente via
    `lastGeneratedAt`).
13. Entrada com `recurringDay` diferente de hoje → não gera nada.
14. Entrada `isRecurring: false` → nunca tocada pelo cron.
15. `?key=` errado → 401.
16. **Tenant:** entrada gerada sempre na clínica da entrada modelo.

## T-4: Gráfico do Dashboard

**UI**
17. Gráfico mostra 12 meses, com receita/despesa batendo com os
    `FinancialEntry` reais (conferir 2-3 meses manualmente contra SELECT).
18. Trocar o filtro de período (This Month/Last Month/This Year/All
    Time) não muda o gráfico (sempre 12 meses fixos).
19. Clínica sem nenhum `FinancialEntry` — estado vazio claro, sem erro.

## T-5: Nota em Categories

**UI**
20. Texto/tooltip visível perto do botão de desativar categoria, deixando
    claro que não é exclusão permanente.

## Transversal (todas as tarefas)

- Nenhum cenário deve notificar o paciente — tudo staff-facing/interno.
- `tsc --noEmit` e `eslint` limpos em todos os arquivos tocados.
- `npm run build` local limpo antes de qualquer push.
- Cuidado redobrado com dado financeiro real (Stripe, FinancialEntry,
  faturas históricas) — fixtures sempre rotulados, nunca ação destrutiva
  em dado real, snapshot antes/depois das 3 faturas históricas continua
  valendo como checagem de segurança padrão desta sessão.
