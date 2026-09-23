# T-1: Model `PatientInvoice`/`PatientInvoiceItem` + gerador de número único

**Status:** concluído
**Depende de:** nenhuma

## Objetivo

Criar o registro estruturado e persistente que hoje não existe, com um
`invoiceNumber` realmente único (não mais uma string formatada na hora sem
checagem de duplicidade).

## Contexto

Ver `plan.md` — Decisões de design. Model novo (`PatientInvoice`), não
reaproveita o `Invoice` do módulo BA One. Enum próprio
`PatientInvoiceStatus` pra não colidir com `InvoiceStatus` existente.

## Passos

1. `prisma/schema.prisma`:
   - `enum PatientInvoiceStatus { DRAFT SENT PAID OVERDUE VOID PARTIALLY_PAID }`
   - `Clinic` ganha `nextInvoiceSeq Int @default(1)` — o contador
     atômico por clínica que garante numeração sequencial sem furo/sem
     repetição (ver `plan.md`).
   - `model PatientInvoice`: `id`, `invoiceNumber String @unique`,
     `clinicId`/`clinic`, `patientId`/`patient` (User), `status
     PatientInvoiceStatus @default(DRAFT)`, `issueDate DateTime
     @default(now())`, `dueDate DateTime?`, `subtotal Float`, `total
     Float`, `currency String @default("GBP")`, `notes String? @db.Text`,
     `pdfBase64 String? @db.Text` (PDF próprio, não só no anexo do
     e-mail), `appointmentId String?` (origem opcional),
     `patientSubscriptionId String?` (origem opcional), `createdById
     String` (staff que gerou — nullable se veio 100% automático de um
     cron), `paidAt DateTime?`, `paidAmount Float?`, `paidById String?`
     (staff que marcou como paga — nulo quando `paidMethod: "stripe"`,
     automático), `paidMethod String?` (ex.: `"stripe"`, `"manual"`),
     timestamps.
   - `model PatientInvoiceItem`: `id`, `invoiceId`/`invoice`,
     `description String`, `quantity Float @default(1)`, `unitPrice
     Float`, `total Float` — só isso, sem vínculo com `ServicePrice`
     (decisão: texto livre, ver `plan.md`).
   - `EmailMessage`: nova coluna `patientInvoiceId String?` (FK nullable,
     `onDelete: SetNull` — apagar a fatura não deve apagar histórico de
     e-mail, e vice-versa).
   - Índices: `@@index([clinicId])`, `@@index([patientId])`,
     `@@index([status])`, `@@index([issueDate])` em `PatientInvoice`;
     `@@index([invoiceId])` em `PatientInvoiceItem`; `@@index([patientInvoiceId])`
     em `EmailMessage`.
2. `lib/patient-invoice-number.ts` — função `generateInvoiceNumber(clinicId)`
   que faz **um único** `prisma.clinic.update({ where: { id: clinicId },
   data: { nextInvoiceSeq: { increment: 1 } }, select: { nextInvoiceSeq:
   true } })` (atômico no Postgres — `UPDATE ... SET x = x + 1` não tem
   race condition mesmo sem transação explícita) e formata o resultado
   como `BPR-{ano}-{seq padded a 6 dígitos}`. **Esta é a ÚNICA função
   permitida a formatar um `invoiceNumber` novo** — todo ponto de
   geração (T-2), presente ou futuro (Stripe automático incluso), chama
   ela. Formato isolado, fácil de trocar depois.
3. `npx prisma db push` local + gerar client; confirmar que não quebra
   nenhum model existente (`Invoice`/`InvoiceItem` do BA One continuam
   intocados).

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/patient-invoice-number.ts` (novo)

## Critérios de aceite

- [ ] Dois `generateInvoiceNumber` chamados em paralelo (ex.: 20
      `Promise.all`) pra mesma clínica nunca colidem e nunca pulam número
      — sequência 100% contígua.
- [ ] `PatientInvoice`/`PatientInvoiceItem` nunca vazam entre clínicas
      (todo acesso futuro precisa escopar por `clinicId`, mesma disciplina
      das atividades anteriores).
- [ ] Módulo BA One (`Invoice`, `InvoiceItem`, `BusinessProfile`) continua
      funcionando sem nenhuma mudança de comportamento.
- [ ] `tsc --noEmit` limpo.
