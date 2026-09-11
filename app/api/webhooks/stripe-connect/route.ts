export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type { BillingSubStatus } from "@prisma/client";

// Stripe Connect webhook — events from trainers' CONNECTED accounts (each event
// carries `event.account`). Separate from the BPR platform webhook
// (app/api/webhooks/stripe) and verified with its own secret. Personal-trainer
// billing only (activity 28).
//
// Two hard rules the gap-QA flagged:
//  - Idempotency (G2): Stripe redelivers. Dedupe by event.id via ProcessedStripeEvent.
//  - ACK unknowns (G2): an unmapped account / irrelevant event returns 200, never
//    4xx — a non-2xx makes Stripe retry for days. 400 only for a bad signature.

const SUB_STATUS_MAP: Record<string, BillingSubStatus> = {
  active: "ACTIVE",
  trialing: "ACTIVE",
  past_due: "PAST_DUE",
  unpaid: "PAST_DUE",
  canceled: "CANCELLED",
  incomplete_expired: "CANCELLED",
};

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const sig = request.headers.get("stripe-signature");
  const raw = await request.text();

  let event: Stripe.Event;
  try {
    if (!secret || !sig) throw new Error("missing signature/secret");
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe-connect] bad signature:", (err as any)?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Idempotency: skip if already processed.
    const seen = await prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
    if (seen) return NextResponse.json({ received: true, duplicate: true });

    const accountId = (event as any).account as string | undefined;
    const clinic = accountId
      ? await prisma.clinic.findUnique({ where: { stripeAccountId: accountId }, select: { id: true } })
      : null;

    // Unmapped account or event we don't handle → ACK (200) and record it so it
    // isn't retried forever.
    if (clinic) {
      await handleEvent(event, clinic.id);
    }
    await prisma.processedStripeEvent.create({ data: { id: event.id, type: event.type } }).catch(() => {});
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe-connect] handler error:", (err as any)?.message);
    // Processing failed for a verified event. The event.id is recorded only
    // AFTER success, so return 500 and let Stripe retry — the dedupe + idempotent
    // (updateMany/upsert) handlers make a retry safe. Acking 200 here would leave
    // a paid subscription stuck INCOMPLETE forever.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event, clinicId: string) {
  switch (event.type) {
    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      const due = acct.requirements?.currently_due ?? [];
      await prisma.clinic.update({
        where: { id: clinicId },
        data: {
          stripeOnboarded: !!acct.charges_enabled,
          stripePayoutsEnabled: !!acct.payouts_enabled,
          stripeRequirementsDue: due.length > 0 || !!acct.requirements?.disabled_reason,
        },
      });
      return;
    }
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = session.metadata?.billingSubscriptionId;
      const sub = subId
        ? await prisma.billingSubscription.findUnique({ where: { id: subId } })
        : await prisma.billingSubscription.findFirst({ where: { stripeCheckoutSessionId: session.id } });
      if (!sub || sub.clinicId !== clinicId) return;
      const isSubscription = session.mode === "subscription";
      await prisma.billingSubscription.update({
        where: { id: sub.id },
        data: {
          status: isSubscription ? "ACTIVE" : "PAID",
          stripeCustomerId: (session.customer as string) || sub.stripeCustomerId,
          stripeSubscriptionId: (session.subscription as string) || sub.stripeSubscriptionId,
        },
      });
      // Persist the customer for reuse on this connected account.
      if (session.customer && sub.stripeCustomerId !== (session.customer as string)) {
        const acctId = (event as any).account as string;
        await prisma.studentStripeCustomer
          .upsert({
            where: { studentId_stripeAccountId: { studentId: sub.studentId, stripeAccountId: acctId } },
            create: { studentId: sub.studentId, stripeAccountId: acctId, customerId: session.customer as string },
            update: { customerId: session.customer as string },
          })
          .catch(() => {});
      }
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const subId = session.metadata?.billingSubscriptionId;
      if (!subId) return;
      // Only clear a still-INCOMPLETE row (don't touch one that later paid).
      await prisma.billingSubscription.updateMany({
        where: { id: subId, clinicId, status: "INCOMPLETE" },
        data: { status: "CANCELLED" },
      });
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const s = event.data.object as Stripe.Subscription;
      const mapped = event.type === "customer.subscription.deleted" ? "CANCELLED" : SUB_STATUS_MAP[s.status] || "ACTIVE";
      const periodEnd = (s as any).current_period_end ? new Date((s as any).current_period_end * 1000) : undefined;
      await prisma.billingSubscription.updateMany({
        where: { stripeSubscriptionId: s.id, clinicId },
        data: {
          status: mapped as BillingSubStatus,
          cancelAtPeriodEnd: !!s.cancel_at_period_end,
          ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          ...(mapped === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        },
      });
      return;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      const subRef = (inv as any).subscription as string | undefined;
      if (!subRef) return;
      const periodEnd = (inv.lines?.data?.[0] as any)?.period?.end;
      await prisma.billingSubscription.updateMany({
        where: { stripeSubscriptionId: subRef, clinicId },
        data: { status: "ACTIVE", ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}) },
      });
      return;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const subRef = (inv as any).subscription as string | undefined;
      if (!subRef) return;
      await prisma.billingSubscription.updateMany({
        where: { stripeSubscriptionId: subRef, clinicId },
        data: { status: "PAST_DUE" },
      });
      return;
    }
    default:
      return; // irrelevant event — already ACKed by the caller
  }
}
