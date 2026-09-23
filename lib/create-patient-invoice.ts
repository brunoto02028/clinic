import { prisma } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/patient-invoice-number";

export interface PatientInvoiceItemInput {
  description: string;
  quantity?: number;
  unitPrice: number;
}

export interface CreatePatientInvoiceOptions {
  clinicId: string;
  patientId: string;
  items: PatientInvoiceItemInput[];
  notes?: string | null;
  dueDate?: Date | null;
  appointmentId?: string | null;
  patientSubscriptionId?: string | null;
  createdById?: string | null;
  /** Set when the underlying charge already cleared via Stripe (e.g. the
   * Appointment's Payment.status is SUCCEEDED) — the invoice is created
   * already PAID, no manual "mark as paid" needed. Leave undefined for the
   * normal DRAFT-until-approved-and-paid flow. */
  alreadyPaidViaStripe?: { amount: number; paidAt: Date } | null;
}

/**
 * The one place that turns a set of line items into a PatientInvoice row
 * (activity 072). Every generation path — the 3 existing entry points, any
 * future one, the historical backfill — goes through this, so
 * invoiceNumber always comes from generateInvoiceNumber() and the
 * Stripe-auto-paid rule is applied consistently instead of re-implemented
 * per caller.
 */
export async function createPatientInvoice(opts: CreatePatientInvoiceOptions) {
  const items = opts.items.map((it) => ({
    description: it.description,
    quantity: it.quantity ?? 1,
    unitPrice: it.unitPrice,
    total: (it.quantity ?? 1) * it.unitPrice,
  }));
  const total = items.reduce((sum, it) => sum + it.total, 0);
  const stripe = opts.alreadyPaidViaStripe;

  // Number + row created in the same transaction (code review) — if the
  // create fails for any reason, the increment rolls back too, so a number
  // is never permanently consumed without a matching invoice existing.
  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(opts.clinicId, tx);
    return tx.patientInvoice.create({
      data: {
        invoiceNumber,
        clinicId: opts.clinicId,
        patientId: opts.patientId,
        status: stripe ? "PAID" : "DRAFT",
        subtotal: total,
        total,
        notes: opts.notes || null,
        dueDate: opts.dueDate || null,
        appointmentId: opts.appointmentId || null,
        patientSubscriptionId: opts.patientSubscriptionId || null,
        createdById: opts.createdById || null,
        paidAt: stripe ? stripe.paidAt : null,
        paidAmount: stripe ? stripe.amount : null,
        paidMethod: stripe ? "stripe" : null,
        items: { create: items },
      },
      include: { items: true },
    });
  });
}
