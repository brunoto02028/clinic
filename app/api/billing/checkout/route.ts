export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getActor, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertStudentNutritionAccess } from "@/lib/nutrition-access";
import { assertChargesEnabled } from "@/lib/connect";
import { isRecurring, applicationFeeCents } from "@/lib/billing";

const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.clinic";

// POST — the student starts checkout for a billing plan. The Checkout Session is
// created ON THE TRAINER'S connected account (direct charge). Money goes to the
// trainer, not BPR. The connected account is resolved server-side from the
// plan's tenant, never from client input (invariant G11).
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertStudentNutritionAccess(actor);

    const body = await request.json().catch(() => null);
    const billingPlanId = body?.billingPlanId;
    if (!billingPlanId) return NextResponse.json({ error: "billingPlanId is required" }, { status: 400 });

    const plan = await prisma.billingPlan.findUnique({ where: { id: billingPlanId } });
    // Plan must belong to the student's own tenant and be active (else 404 — no oracle).
    if (!plan || plan.clinicId !== actor.clinicId || plan.status !== "ACTIVE" || !plan.stripePriceId) {
      throw new AccessError(404, "Not found");
    }
    const stripeAccount = await assertChargesEnabled(plan.clinicId); // 409 if trainer not onboarded
    const recurring = isRecurring(plan.interval);

    // G6 — one live recurring subscription per student. PAST_DUE is still a
    // live subscription (Stripe keeps retrying the card), so it counts too.
    if (recurring) {
      const existing = await prisma.billingSubscription.findFirst({
        where: { studentId: actor.userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
        include: { billingPlan: { select: { interval: true } } },
      });
      if (existing && existing.billingPlan.interval !== "ONE_TIME") {
        return NextResponse.json({ error: "You already have an active subscription. Cancel it before subscribing to another." }, { status: 409 });
      }
    }

    // G3 — reuse the student's Stripe customer on this connected account.
    const me = await prisma.user.findUnique({ where: { id: actor.userId }, select: { email: true } });
    let customerId: string | undefined;
    const known = await prisma.studentStripeCustomer.findUnique({
      where: { studentId_stripeAccountId: { studentId: actor.userId, stripeAccountId: stripeAccount } },
    });
    if (known) {
      customerId = known.customerId;
    } else {
      const customer = await stripe.customers.create({ email: me?.email || undefined }, { stripeAccount });
      customerId = customer.id;
      await prisma.studentStripeCustomer.create({
        data: { studentId: actor.userId, stripeAccountId: stripeAccount, customerId },
      });
    }

    // One open checkout per student on this account (activity 52, T-10): a
    // second tab (or a second plan) used to open another session while the
    // first stayed payable, so paying both left an orphan subscription the
    // trainer couldn't see, cancel or refund. Expire the earlier ones first;
    // an already-completed or expired session just fails and is skipped.
    const openCheckouts = await prisma.billingSubscription.findMany({
      where: { studentId: actor.userId, clinicId: plan.clinicId, status: "INCOMPLETE", stripeCheckoutSessionId: { not: null } },
      select: { stripeCheckoutSessionId: true },
    });
    for (const open of openCheckouts) {
      try {
        await stripe.checkout.sessions.expire(open.stripeCheckoutSessionId!, {}, { stripeAccount });
      } catch (err: any) {
        // "Not open any more" (already paid/expired/missing) is a 4xx invalid
        // request — fine to skip. A network or Stripe-side failure means the
        // old session may still be payable, so don't open a second one.
        if (err?.type !== "StripeInvalidRequestError") {
          console.error("[billing/checkout] could not expire previous session:", err?.message);
          return NextResponse.json({ error: "Could not start checkout right now. Please try again." }, { status: 502 });
        }
      }
    }

    // G5 — reuse the one INCOMPLETE row for (student, plan) instead of piling up.
    const existingIncomplete = await prisma.billingSubscription.findFirst({
      where: { studentId: actor.userId, billingPlanId: plan.id, status: "INCOMPLETE" },
    });
    const sub = existingIncomplete
      ? existingIncomplete
      : await prisma.billingSubscription.create({
          data: {
            clinicId: plan.clinicId,
            trainerId: plan.trainerId,
            studentId: actor.userId,
            billingPlanId: plan.id,
            status: "INCOMPLETE",
            stripeCustomerId: customerId,
          },
        });

    // Platform fee is 0 in v1 (BPR takes nothing) → no application_fee. When a
    // fee is wanted, wire application_fee_amount (payment) / application_fee_percent
    // (subscription) here, applied only when > 0.
    const fee = applicationFeeCents(plan.amountCents);
    const session = await stripe.checkout.sessions.create(
      {
        mode: recurring ? "subscription" : "payment",
        customer: customerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${BASE_URL}/dashboard/billing?status=success`,
        cancel_url: `${BASE_URL}/dashboard/billing?status=cancelled`,
        metadata: { billingSubscriptionId: sub.id, billingPlanId: plan.id, studentId: actor.userId },
        ...(fee > 0 && !recurring ? { payment_intent_data: { application_fee_amount: fee } } : {}),
      },
      { stripeAccount }
    );

    await prisma.billingSubscription.update({
      where: { id: sub.id },
      data: { stripeCustomerId: customerId, stripeCheckoutSessionId: session.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[billing/checkout] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
