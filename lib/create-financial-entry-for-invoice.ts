import { prisma } from "@/lib/db";
import type { Prisma, PaymentMethodType, IncomeCategory } from "@prisma/client";

type Db = typeof prisma | Prisma.TransactionClient;

/**
 * The single place a paid PatientInvoice turns into ledger income
 * (activity 073) — called both when an invoice is marked paid manually
 * and when one is created already paid via Stripe. Before this, the
 * Finance Dashboard/Income showed £0 no matter how many invoices were
 * actually paid, because nothing ever wrote a FinancialEntry for them.
 *
 * `db` accepts a `$transaction` callback client so the caller can create
 * the FinancialEntry and link it via PatientInvoice.financialEntryId
 * atomically with whatever else it's doing (marking the invoice paid,
 * or creating the invoice itself already paid).
 */
export async function createFinancialEntryForInvoice(opts: {
  db: Db;
  clinicId: string;
  patientId: string;
  patientName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  paidAt: Date;
  paymentMethod: PaymentMethodType;
  stripePaymentIntentId?: string | null;
  appointmentId?: string | null;
  patientSubscriptionId?: string | null;
}): Promise<string> {
  const { db } = opts;

  // Consultation vs. membership vs. a catch-all for a standalone invoice —
  // there's no structured service on a free-text invoice item to do
  // better than this without guessing at the description text.
  const incomeCategory: IncomeCategory = opts.appointmentId
    ? "CONSULTATION"
    : opts.patientSubscriptionId
      ? "MEMBERSHIP"
      : "OTHER_INCOME";

  const entry = await db.financialEntry.create({
    data: {
      clinicId: opts.clinicId,
      type: "INCOME",
      status: "PAID",
      description: `Invoice ${opts.invoiceNumber} — ${opts.patientName}`,
      amount: opts.amount,
      currency: opts.currency,
      incomeCategory,
      paidDate: opts.paidAt,
      paymentMethod: opts.paymentMethod,
      // Same field the Stripe sync (T-2) dedupes on — writing it here too
      // means a later sync that sees this same charge/payment intent
      // skips it instead of double-counting the income.
      stripePaymentIntentId: opts.stripePaymentIntentId || null,
      patientId: opts.patientId,
      patientName: opts.patientName,
    },
  });

  await db.patientInvoice.update({
    where: { id: opts.invoiceId },
    data: { financialEntryId: entry.id },
  });

  return entry.id;
}
