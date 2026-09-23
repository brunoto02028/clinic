import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getSenderEmail } from "@/lib/utils";
import { InvoiceData } from "@/lib/invoice-html";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

type Db = typeof prisma | Prisma.TransactionClient;

/** Shared by every invoice-generating route (activity 39/40): never call
 * sendEmail directly for a financial email — always queue it here so the
 * admin previews and approves the exact frozen content before it sends. */
export async function queueInvoiceForApproval(opts: {
  invoice: InvoiceData;
  patientEmail: string;
  patientId?: string | null;
  clinicId?: string | null;
  /** Activity 072 — when set, links the resulting EmailMessage back to the
   * structured PatientInvoice it carries, and saves the PDF onto that
   * record too (not just this e-mail's attachment) so it stays downloadable
   * even if this EmailMessage is later purged. */
  patientInvoiceId?: string | null;
  /** Activity 072 follow-up — pass a `$transaction` callback client so the
   * caller can hold a row lock across discard-old + create-new (see
   * app/api/admin/invoices/[id]/queue/route.ts) and close the race where
   * two near-simultaneous "Resend" clicks each pass the check and each
   * create a PENDING_APPROVAL e-mail. Defaults to the plain client for
   * every other (non-concurrent-sensitive) caller. */
  db?: Db;
}): Promise<{ pendingId: string; invoiceNumber: string }> {
  const { invoice, patientEmail, patientId, clinicId, patientInvoiceId, db = prisma } = opts;
  // A real PDF, not the HTML file this used to attach — Gmail (and most mail
  // clients) never render an HTML attachment inline for security reasons, so
  // every invoice sent this way showed the patient raw markup instead of the
  // invoice (found 22/09/2026, patient screenshot of the Gmail preview). A
  // PDF previews natively everywhere.
  const pdf = buildInvoicePdf(invoice);
  const total = invoice.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  const emailBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#26332B;">
      <p>Dear ${invoice.clientName},</p>
      <p>Please find attached your invoice <strong>${invoice.invoiceNumber}</strong> for <strong>£${total.toFixed(2)}</strong>.</p>
      <p>You can pay by cash at your appointment, or by bank transfer using the details in the attached invoice.</p>
      <p>If you have any questions, just reply to this email.</p>
      <p>Kind regards,<br>${invoice.business.tradingName}</p>
    </div>
  `;

  const subject = `Invoice ${invoice.invoiceNumber} — ${invoice.business.tradingName}`;
  const attachmentsJson = JSON.stringify([
    {
      filename: `Invoice-${invoice.invoiceNumber}.pdf`,
      contentBase64: pdf.toString("base64"),
    },
  ]);

  if (patientInvoiceId) {
    await db.patientInvoice.update({
      where: { id: patientInvoiceId },
      data: { pdfBase64: pdf.toString("base64") },
    });
  }

  const pending = await (db as any).emailMessage.create({
    data: {
      direction: "OUTBOUND",
      folder: "PENDING_APPROVAL",
      fromAddress: getSenderEmail(),
      fromName: invoice.business.tradingName,
      toAddress: patientEmail,
      subject,
      htmlBody: emailBody,
      attachmentsJson,
      templateSlug: "INVOICE",
      isRead: true,
      patientId: patientId || null,
      clinicId: clinicId || null,
      patientInvoiceId: patientInvoiceId || null,
    },
  });

  return { pendingId: pending.id, invoiceNumber: invoice.invoiceNumber };
}
