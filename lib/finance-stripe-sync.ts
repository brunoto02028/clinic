import { prisma } from "@/lib/db";
import Stripe from "stripe";

/**
 * Pulls the platform's Stripe charges + payment intents into
 * FinancialEntry rows (activity 073 — extracted out of the manual "Sync
 * Stripe" button's POST handler so a cron can call the exact same logic
 * without a browser session). Same dedupe as always: skip anything whose
 * stripeChargeId/stripePaymentIntentId is already on a FinancialEntry for
 * this clinic — including one a paid PatientInvoice already wrote
 * (lib/create-financial-entry-for-invoice.ts), so a Stripe-paid invoice
 * never gets double-counted once this sync later sees the same charge.
 */
export async function syncStripeFinancialEntries(clinicId: string): Promise<{ imported: number; skipped: number; total: number }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    throw new Error("Stripe not configured");
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" as any });

  const charges = await stripe.charges.list({ limit: 100 });
  let imported = 0;
  let skipped = 0;

  for (const charge of charges.data) {
    if (!charge.paid || charge.refunded) continue;

    const existing = await prisma.financialEntry.findFirst({
      where: {
        clinicId,
        OR: [
          { stripeChargeId: charge.id },
          ...(typeof charge.payment_intent === "string" ? [{ stripePaymentIntentId: charge.payment_intent }] : []),
        ],
      },
    });
    if (existing) {
      skipped++;
      continue;
    }

    let patientName: string | null = null;
    let patientId: string | null = null;

    if (charge.customer) {
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer.id;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email;
          if (email) {
            const patient = await prisma.user.findUnique({
              where: { email },
              select: { id: true, firstName: true, lastName: true },
            });
            if (patient) {
              patientId = patient.id;
              patientName = `${patient.firstName} ${patient.lastName}`;
            } else {
              patientName = (customer as Stripe.Customer).name || email;
            }
          }
        }
      } catch {}
    }

    let incomeCategory: string = "OTHER_INCOME";
    const desc = (charge.description || "").toLowerCase();
    if (desc.includes("consult")) incomeCategory = "CONSULTATION";
    else if (desc.includes("package") || desc.includes("treatment")) incomeCategory = "TREATMENT_PACKAGE";
    else if (desc.includes("member") || desc.includes("subscription")) incomeCategory = "MEMBERSHIP";
    else if (desc.includes("scan") || desc.includes("foot")) incomeCategory = "FOOT_SCAN";
    else if (desc.includes("assessment") || desc.includes("body")) incomeCategory = "BODY_ASSESSMENT";
    else if (desc.includes("product") || desc.includes("shop")) incomeCategory = "PRODUCT_SALE";

    await prisma.financialEntry.create({
      data: {
        clinicId,
        type: "INCOME",
        status: "PAID",
        description: charge.description || `Stripe Payment — ${charge.id.slice(-8)}`,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        incomeCategory: incomeCategory as any,
        paidDate: new Date(charge.created * 1000),
        paymentMethod: "STRIPE",
        stripeChargeId: charge.id,
        stripePaymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null,
        patientId,
        patientName,
      },
    });
    imported++;
  }

  // Also sync payment intents that might not have charges
  const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
  for (const pi of paymentIntents.data) {
    if (pi.status !== "succeeded") continue;

    const existing = await prisma.financialEntry.findFirst({
      where: { clinicId, stripePaymentIntentId: pi.id },
    });
    if (existing) continue;

    let patientName: string | null = null;
    let patientId: string | null = null;

    if (pi.customer) {
      const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer.id;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer && !customer.deleted) {
          const email = (customer as Stripe.Customer).email;
          if (email) {
            const patient = await prisma.user.findUnique({
              where: { email },
              select: { id: true, firstName: true, lastName: true },
            });
            if (patient) {
              patientId = patient.id;
              patientName = `${patient.firstName} ${patient.lastName}`;
            }
          }
        }
      } catch {}
    }

    let incomeCategory: string = "OTHER_INCOME";
    const desc = (pi.description || "").toLowerCase();
    if (desc.includes("consult")) incomeCategory = "CONSULTATION";
    else if (desc.includes("package") || desc.includes("treatment")) incomeCategory = "TREATMENT_PACKAGE";
    else if (desc.includes("member")) incomeCategory = "MEMBERSHIP";

    await prisma.financialEntry.create({
      data: {
        clinicId,
        type: "INCOME",
        status: "PAID",
        description: pi.description || `Stripe Payment — ${pi.id.slice(-8)}`,
        amount: pi.amount / 100,
        currency: pi.currency.toUpperCase(),
        incomeCategory: incomeCategory as any,
        paidDate: new Date(pi.created * 1000),
        paymentMethod: "STRIPE",
        stripePaymentIntentId: pi.id,
        patientId,
        patientName,
      },
    });
    imported++;
  }

  return { imported, skipped, total: charges.data.length + paymentIntents.data.length };
}
