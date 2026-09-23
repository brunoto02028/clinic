import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { InvoiceData } from "@/lib/invoice-html";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { getInvoiceBusinessInfo } from "@/lib/invoice-business-info";

type Db = typeof prisma | Prisma.TransactionClient;

/** Builds the InvoiceData a fresh PDF/e-mail needs, straight from the
 * PatientInvoice's CURRENT items/patient/business — shared by
 * regenerateInvoicePdf() below and the resend/queue-for-approval action, so
 * both always agree on what "the invoice today" looks like. */
export async function buildInvoiceDataForInvoice(invoiceId: string, db: Db = prisma) {
  const invoice = await db.patientInvoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true, patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });

  const business = await getInvoiceBusinessInfo(invoice.clinicId);
  const data: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    business,
    clientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
    clientEmail: invoice.patient.email,
    items: invoice.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice })),
    notes: invoice.notes,
    acceptsCash: true,
    acceptsBankTransfer: true,
  };

  return { invoice, data, patientEmail: invoice.patient.email };
}

/**
 * Rebuilds the PDF for a PatientInvoice from its CURRENT items/patient/
 * business data and saves it onto PatientInvoice.pdfBase64 — used after
 * editing a DRAFT's items, so the "Download PDF" button and any preview
 * never drift from what the items actually say.
 *
 * `db` accepts a `$transaction` callback client (activity 072 follow-up,
 * code review) — the item-edit PATCH handler runs this write in the SAME
 * transaction as the item replace + the stale-pending-e-mail discard, so a
 * crash mid-request can never leave `total` updated but `pdfBase64` (or the
 * discard) still reflecting the old items.
 */
export async function regenerateInvoicePdf(invoiceId: string, db: Db = prisma): Promise<Buffer> {
  const { data } = await buildInvoiceDataForInvoice(invoiceId, db);
  const pdf = buildInvoicePdf(data);
  await db.patientInvoice.update({ where: { id: invoiceId }, data: { pdfBase64: pdf.toString("base64") } });
  return pdf;
}
