# T-1: Fatura paga gera `FinancialEntry` automaticamente (correção crítica)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

Fecha o gap achado no QA: hoje marcar uma fatura como paga (manual ou
automático via Stripe) nunca alimenta o livro-caixa — o Dashboard fica
zerado mesmo com receita real.

## Contexto

Dois pontos de criação de `PatientInvoice` PAID: manual (`markPaid` em
`app/api/admin/invoices/[id]/route.ts`) e automático
(`alreadyPaidViaStripe` em `lib/create-patient-invoice.ts`, ativ. 072). Os
dois precisam criar o `FinancialEntry` correspondente.

## Passos

1. `prisma/schema.prisma`: `PatientInvoice` ganha
   `financialEntryId String? @unique`, `financialEntry FinancialEntry?
   @relation(fields: [financialEntryId], references: [id], onDelete:
   SetNull)`.
2. `lib/create-patient-invoice.ts` — no branch `alreadyPaidViaStripe`,
   depois de criar o `PatientInvoice`, criar o `FinancialEntry`
   correspondente na MESMA transação: `type: INCOME`, `status: PAID`,
   `description: "Invoice ${invoiceNumber} — ${patientName}"`, `amount`,
   `currency`, `incomeCategory` inferida pela origem (ver `plan.md`),
   `paidDate`, `paymentMethod: STRIPE`, `stripePaymentIntentId` (do
   `Payment` original, pra dedupe futuro com o sync — ver T-2),
   `patientId`/`patientName`, `clinicId`. Linkar via `financialEntryId`.
3. `app/api/admin/invoices/[id]/route.ts` — branch `markPaid`: mesma
   coisa, mas `paymentMethod` vindo do seletor novo (ver Suposição 2 do
   plan.md) em vez de sempre `STRIPE`, sem `stripePaymentIntentId`.
4. Idempotência: se `PatientInvoice.financialEntryId` já estiver
   preenchido (não deveria acontecer dado os guards de status já
   existentes, mas defensivo), não duplicar.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/create-patient-invoice.ts`
- `app/api/admin/invoices/[id]/route.ts`
- `components/admin/finance-invoices-section.tsx` (seletor opcional de
  forma de pagamento no "Mark as paid", Suposição 2)

## Critérios de aceite

- [ ] Marcar fatura como paga (manual) cria um `FinancialEntry` PAID
      correto, aparece no Dashboard/Income imediatamente.
- [ ] Fatura que já nasce paga via Stripe (agendamento com Payment
      SUCCEEDED) cria o `FinancialEntry` na mesma hora que a fatura é
      gerada, sem precisar de ação extra.
- [ ] Nenhuma duplicidade: rodar o sync do Stripe (T-2) depois não conta
      a mesma cobrança duas vezes (dedupe por `stripePaymentIntentId`).
- [ ] Tenant: `FinancialEntry` criado sempre no `clinicId` certo.
