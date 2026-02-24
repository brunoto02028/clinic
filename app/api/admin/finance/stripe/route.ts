import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// POST — sync Stripe payments into FinancialEntry
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" as any });

  try {
    // Fetch recent charges from Stripe (last 100)
    const charges = await stripe.charges.list({ limit: 100 });
    let imported = 0;
    let skipped = 0;

    for (const charge of charges.data) {
      if (!charge.paid || charge.refunded) continue;

      // Skip if already imported
      const existing = await prisma.financialEntry.findFirst({
        where: {
          clinicId: user.clinicId,
          stripeChargeId: charge.id,
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Try to find linked patient
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

      // Determine category from metadata or description
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
          clinicId: user.clinicId,
          type: "INCOME",
          status: "PAID",
          description: charge.description || `Stripe Payment — ${charge.id.slice(-8)}`,
          amount: charge.amount / 100, // Stripe uses cents
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
        where: {
          clinicId: user.clinicId,
          stripePaymentIntentId: pi.id,
        },
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
          clinicId: user.clinicId,
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

    return NextResponse.json({ imported, skipped, total: charges.data.length + paymentIntents.data.length });
  } catch (err: any) {
    console.error("Stripe sync error:", err);
    return NextResponse.json({ error: err.message || "Stripe sync failed" }, { status: 500 });
  }
}

// GET — get Stripe balance and recent activity summary
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ balance: null, recentCharges: [], configured: false });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" as any });

  try {
    const [balance, recentCharges] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.charges.list({ limit: 10 }),
    ]);

    return NextResponse.json({
      configured: true,
      balance: {
        available: balance.available.map((b) => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() })),
        pending: balance.pending.map((b) => ({ amount: b.amount / 100, currency: b.currency.toUpperCase() })),
      },
      recentCharges: recentCharges.data.map((c) => ({
        id: c.id,
        amount: c.amount / 100,
        currency: c.currency.toUpperCase(),
        status: c.status,
        paid: c.paid,
        description: c.description,
        created: new Date(c.created * 1000).toISOString(),
        customerEmail: c.billing_details?.email || null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ configured: true, error: err.message, balance: null, recentCharges: [] });
  }
}
