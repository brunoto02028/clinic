# T-2: Migrar os 3 pontos de geração + backfill das 4 faturas históricas

**Status:** concluído
**Depende de:** T-1

## Objetivo

Cada ponto de geração passa a criar um `PatientInvoice` (com itens
estruturados) ANTES de enfileirar o e-mail — o e-mail passa a carregar o
PDF gerado a partir desse registro, e fica vinculado a ele
(`EmailMessage.patientInvoiceId`). As 4 faturas já enviadas em produção
ganham o mesmo registro estruturado, retroativamente.

## Contexto

Três pontos, mesmo padrão em todos: criar `PatientInvoice`+itens →
verificar se a origem já foi paga via Stripe (auto-`PAID`) →
`buildInvoicePdf` a partir desses dados → salvar `pdfBase64` no
`PatientInvoice` → `queueInvoiceForApproval` (que passa a receber o PDF já
pronto, não gerá-lo por conta própria) → linkar o `EmailMessage` resultante
via `patientInvoiceId`.

## Passos

1. `app/api/admin/patients/[id]/invoice/route.ts` — fatura avulsa: cria
   `PatientInvoice` (sem origem) + itens a partir do body recebido, número
   via `generateInvoiceNumber`, `paidMethod`/status sempre manual (não há
   Stripe numa fatura avulsa).
2. `app/api/admin/appointments/[id]/invoice/route.ts` — fatura por
   agendamento: mesma coisa, com `appointmentId` preenchido. **Antes de
   criar como `DRAFT`, checar `Payment` desse agendamento**
   (`Payment.appointmentId`, `Payment.status === "SUCCEEDED"`) — se pago
   via Stripe, a fatura já nasce `status: PAID`, `paidAt`/`paidAmount`
   vindos do `Payment`, `paidMethod: "stripe"`, `paidById: null`.
3. `app/api/cron/membership-invoices/route.ts` +
   `lib/invoice-for-subscription.ts` — cron de assinatura: mesma coisa,
   com `patientSubscriptionId` preenchido. Mesma checagem Stripe: se a
   `PatientSubscription` é gerenciada via Stripe (tem
   `stripeSubscriptionId`), a fatura nasce `PAID` automaticamente; senão
   segue `DRAFT` (fluxo manual atual, sem mudança).
4. `lib/invoice-pending.ts` (`queueInvoiceForApproval`) — ajustar
   assinatura pra aceitar o PDF já pronto (ou o `PatientInvoice.id`) em vez
   de montar os dados e gerar o PDF internamente; setar
   `EmailMessage.patientInvoiceId` na criação.
5. **Backfill das 4 faturas históricas** (`scripts/backfill-patient-invoices.js`,
   idempotente, mesmo padrão dos backfills anteriores — ex.
   `scripts/backfill-email-message-clinicid.js`): pra cada `EmailMessage`
   com `templateSlug: "INVOICE"`, criar um `PatientInvoice` com
   `status: SENT` (ou `TRASH`→`VOID`, decidir olhando o dado real das 4),
   `invoiceNumber` **extraído do assunto/PDF já existente** (não gerado
   pela nova sequência — preservar o valor original pra não duplicar/
   confundir com uma fatura nova), item único "Invoice — ver PDF anexado"
   se não der pra extrair itens estruturados com confiança do PDF antigo,
   e `patientInvoiceId` linkado de volta no `EmailMessage`. Rodar contra
   produção só depois de revisão manual das 4 linhas (são poucas — dá pra
   conferir uma por uma antes).
6. Conferir que os 3 callers continuam funcionando pro fluxo normal
   (mesma clínica, item digitado, override de valor, etc.) — nenhuma
   regressão de comportamento visível pro admin.

## Arquivos afetados

- `app/api/admin/patients/[id]/invoice/route.ts`
- `app/api/admin/appointments/[id]/invoice/route.ts`
- `app/api/cron/membership-invoices/route.ts`
- `lib/invoice-for-subscription.ts`
- `lib/invoice-pending.ts`
- `scripts/backfill-patient-invoices.js` (novo, rodado uma vez)

## Critérios de aceite

- [ ] Cada uma das 3 faturas geradas cria um `PatientInvoice` com itens
      corretos e `invoiceNumber` único.
- [ ] Fatura por agendamento/assinatura já paga via Stripe nasce `PAID`
      automaticamente, sem exigir clique manual.
- [ ] O `EmailMessage` resultante (`PENDING_APPROVAL`) tem
      `patientInvoiceId` preenchido apontando pro registro certo.
- [ ] `PatientInvoice.status` começa `DRAFT` (ou `PAID`, se Stripe) até a
      aprovação (T-3 cuida da transição `DRAFT`→`SENT`).
- [ ] Backfill roda uma vez, cria exatamente 4 `PatientInvoice`, sem
      duplicar `invoiceNumber` nem perder nenhuma das 4 (confirmar por
      SELECT antes/depois — mesmo padrão de auditoria das atividades
      70/71).
- [ ] Nenhuma regressão no fluxo de aprovação/envio já existente (fluxo
      testado nas atividades 070/071 continua passando).
