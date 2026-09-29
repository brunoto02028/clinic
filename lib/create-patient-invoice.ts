import { prisma } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/patient-invoice-number";
import { createFinancialEntryForInvoice } from "@/lib/create-financial-entry-for-invoice";

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
  /** Set when the underlying charge already cleared (e.g. the Appointment's
   * Payment.status is SUCCEEDED) — the invoice is created already PAID, no
   * manual "mark as paid" needed. Leave undefined for the normal
   * DRAFT-until-approved-and-paid flow.
   *
   * `channel` says **how** it cleared. It used to be hardcoded to Stripe, and
   * once the clinic could record a bank transfer by hand (106 T-6) that made
   * the invoice and the ledger both claim a card payment that never happened —
   * with a null payment intent to prove it. QA caught it.
   *
   * The name kept `ViaStripe` for a while and stopped being true; it is
   * `alreadyPaid` now, because a field that lies about its own contents is how
   * the next person repeats the mistake. */
  alreadyPaid?: {
    amount: number;
    paidAt: Date;
    channel?: "STRIPE" | "TRANSFER" | "CASH" | null;
    stripePaymentIntentId?: string | null;
  } | null;
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
  const pago = opts.alreadyPaid;
  const canal = pago?.channel ?? "STRIPE";
  /**
   * O livro financeiro já sabia falar de transferência e dinheiro —
   * `PaymentMethodType` tem `BANK_TRANSFER` e `CASH` desde sempre. O que estava
   * errado era o valor, fixo em `"STRIPE"`.
   */
  const noLivro = canal === "TRANSFER" ? "BANK_TRANSFER" : canal;

  // Number + row created in the same transaction (code review) — if the
  // create fails for any reason, the increment rolls back too, so a number
  // is never permanently consumed without a matching invoice existing.
  return prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(opts.clinicId, tx);
    const invoice = await tx.patientInvoice.create({
      data: {
        invoiceNumber,
        clinicId: opts.clinicId,
        patientId: opts.patientId,
        status: pago ? "PAID" : "DRAFT",
        subtotal: total,
        total,
        notes: opts.notes || null,
        dueDate: opts.dueDate || null,
        appointmentId: opts.appointmentId || null,
        patientSubscriptionId: opts.patientSubscriptionId || null,
        createdById: opts.createdById || null,
        paidAt: pago ? pago.paidAt : null,
        paidAmount: pago ? pago.amount : null,
        paidMethod: pago ? canal.toLowerCase() : null,
        items: { create: items },
      },
      include: { items: true, patient: { select: { firstName: true, lastName: true } } },
    });

    // Activity 073 — an invoice born PAID via Stripe used to leave the
    // Finance Dashboard/Income permanently blind to it (nothing ever wrote
    // a FinancialEntry for a paid invoice). Same transaction as the
    // invoice itself, so the two can never disagree about whether this
    // payment happened.
    if (pago) {
      await createFinancialEntryForInvoice({
        db: tx,
        clinicId: opts.clinicId,
        patientId: opts.patientId,
        patientName: `${invoice.patient.firstName} ${invoice.patient.lastName}`,
        invoiceId: invoice.id,
        invoiceNumber,
        amount: pago.amount,
        currency: invoice.currency,
        paidAt: pago.paidAt,
        paymentMethod: noLivro,
        stripePaymentIntentId: pago.stripePaymentIntentId ?? null,
        appointmentId: opts.appointmentId,
        patientSubscriptionId: opts.patientSubscriptionId,
      });
    }

    return invoice;
  });
}
