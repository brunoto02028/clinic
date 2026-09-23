// Activity 72: before this activity, an invoice was just a PDF/HTML
// attachment on a generic EmailMessage — no structured PatientInvoice
// existed. Production has exactly 4 EmailMessage rows with
// templateSlug: "INVOICE" (checked 23/09/2026), covering 3 distinct
// invoice numbers (one of them was sent twice — an earlier attempt landed
// in TRASH, a second one actually reached the patient's inbox as SENT).
//
// This creates ONE PatientInvoice per distinct invoiceNumber found in
// those subjects, links every EmailMessage sharing that number back to it
// (EmailMessage.patientInvoiceId), and preserves the original
// invoiceNumber exactly as it was sent — it is NOT reissued through
// generateInvoiceNumber(), which would both waste a real sequence slot and
// no longer match what the patient actually received.
//
// Amount: extracted from the confirmation e-mail's own body ("for
// <strong>£700.00</strong>"), which is the one reliably-present,
// human-verified number for each of these — the original attachment for 3
// of the 4 is HTML (pre-activity-070, before invoices became real PDFs),
// not a PDF this script could re-parse. Item list is therefore a single
// descriptive line, not the original itemisation, and pdfBase64 is left
// null on purpose (fabricating a PDF that looks "original" would be worse
// than admitting there isn't one — the linked EmailMessage still holds the
// real historical attachment via patientInvoiceId).
//
// Idempotent: only ever touches EmailMessage rows with
// templateSlug: "INVOICE" AND patientInvoiceId IS NULL. Run once, safe to
// re-run (finds nothing left to do the second time).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AMOUNT_RE = /for <strong>£([\d,]+\.\d{2})<\/strong>/;
const NUMBER_RE = /Invoice (\S+) —/;

async function main() {
  const rows = await prisma.emailMessage.findMany({
    where: { templateSlug: 'INVOICE', patientInvoiceId: null },
    select: { id: true, subject: true, htmlBody: true, folder: true, patientId: true, clinicId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) {
    console.log('[backfill-patient-invoices] No un-backfilled invoice e-mails — nothing to do.');
    return;
  }

  // Group by invoiceNumber (extracted from the subject) — one PatientInvoice
  // per distinct number, even if it was sent more than once.
  const groups = new Map(); // invoiceNumber -> { emailIds: [], first row's data }
  let unparsed = 0;
  for (const row of rows) {
    const numberMatch = row.subject.match(NUMBER_RE);
    if (!numberMatch || !row.patientId || !row.clinicId) {
      unparsed++;
      console.error(`[backfill-patient-invoices] EmailMessage ${row.id}: could not parse invoiceNumber/patientId/clinicId from "${row.subject}" — left as-is, needs manual review.`);
      continue;
    }
    const invoiceNumber = numberMatch[1];
    const amountMatch = row.htmlBody?.match(AMOUNT_RE);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;
    if (!groups.has(invoiceNumber)) {
      groups.set(invoiceNumber, {
        invoiceNumber,
        patientId: row.patientId,
        clinicId: row.clinicId,
        issueDate: row.createdAt,
        amount,
        emailIds: [],
        anySent: false,
      });
    }
    const group = groups.get(invoiceNumber);
    group.emailIds.push(row.id);
    if (row.folder === 'SENT') group.anySent = true;
    if (amount != null && group.amount == null) group.amount = amount;
  }

  let created = 0;
  for (const group of groups.values()) {
    if (group.amount == null) {
      console.error(`[backfill-patient-invoices] ${group.invoiceNumber}: could not extract an amount from any linked e-mail body — skipped, needs manual entry.`);
      continue;
    }
    // Create + link committed together (code review) — a crash between the
    // two calls used to leave an orphaned e-mail AND a permanently-stuck
    // invoiceNumber (the next run's create would collide on @unique).
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.patientInvoice.create({
        data: {
          invoiceNumber: group.invoiceNumber,
          clinicId: group.clinicId,
          patientId: group.patientId,
          status: group.anySent ? 'SENT' : 'VOID', // VOID: every copy of it ended up in TRASH, never actually delivered
          subtotal: group.amount,
          total: group.amount,
          issueDate: group.issueDate,
          notes: 'Imported from e-mail history (activity 072 backfill) — original itemisation not available; see the linked e-mail(s) for the original attachment.',
          items: {
            create: [{ description: 'Historical invoice (imported from e-mail history)', quantity: 1, unitPrice: group.amount, total: group.amount }],
          },
        },
      });
      await tx.emailMessage.updateMany({
        where: { id: { in: group.emailIds } },
        data: { patientInvoiceId: inv.id },
      });
      return inv;
    });
    created++;
    console.log(`[backfill-patient-invoices] Created ${invoice.invoiceNumber} (${invoice.status}, £${group.amount.toFixed(2)}) linked to ${group.emailIds.length} e-mail(s).`);
  }

  console.log(`[backfill-patient-invoices] Done — ${created} PatientInvoice(s) created from ${rows.length} e-mail row(s), ${unparsed} left unparsed.`);
}

main()
  .catch((err) => console.error('[backfill-patient-invoices] Error:', err.message))
  .finally(() => prisma.$disconnect());
