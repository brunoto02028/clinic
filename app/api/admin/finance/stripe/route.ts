import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getSuperadminActor } from "@/lib/tenant-access";
import { syncStripeFinancialEntries } from "@/lib/finance-stripe-sync";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

// POST — sync Stripe payments into FinancialEntry (manual button). Actual
// sync logic lives in lib/finance-stripe-sync.ts (activity 073) so
// app/api/cron/finance-stripe-sync can run the identical thing on a
// schedule, without a browser session.
export async function POST(req: NextRequest) {
  // Uses the platform's own Stripe key (balance, recent charges with customer
  // e-mails) — the platform owner's only (activity 52, T-6).
  if (!(await getSuperadminActor(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
  if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 400 });

  try {
    const result = await syncStripeFinancialEntries(user.clinicId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Stripe sync error:", err);
    return NextResponse.json({ error: err.message || "Stripe sync failed" }, { status: 500 });
  }
}

// GET — get Stripe balance and recent activity summary
export async function GET(req: NextRequest) {
  // Uses the platform's own Stripe key (balance, recent charges with customer
  // e-mails) — the platform owner's only (activity 52, T-6).
  if (!(await getSuperadminActor(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      recentCharges: recentCharges.data.map((c: any) => ({
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
