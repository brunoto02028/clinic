export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { resolveConnectedAccount } from "@/lib/connect";

// POST — the trainer cancels or refunds a student's billing subscription. Runs
// on the trainer's OWN connected account (G7): only staff of that tenant, never
// BPR. Body: { action: "cancel" | "refund", immediate?: boolean }.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);

    const sub = await prisma.billingSubscription.findUnique({ where: { id: params.id } });
    assertRecordAccess(actor, { clinicId: sub?.clinicId ?? null }); // 404 if other tenant/missing
    const stripeAccount = await resolveConnectedAccount(clinicId);

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (action === "cancel") {
      if (sub!.stripeSubscriptionId) {
        if (body?.immediate) {
          await stripe.subscriptions.cancel(sub!.stripeSubscriptionId, { stripeAccount }).catch(() => {});
          await prisma.billingSubscription.update({ where: { id: sub!.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
        } else {
          await stripe.subscriptions.update(sub!.stripeSubscriptionId, { cancel_at_period_end: true }, { stripeAccount }).catch(() => {});
          await prisma.billingSubscription.update({ where: { id: sub!.id }, data: { cancelAtPeriodEnd: true } });
        }
      } else {
        // one-time / no live subscription → just mark cancelled locally
        await prisma.billingSubscription.update({ where: { id: sub!.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      }
      return NextResponse.json({ success: true });
    }

    if (action === "refund") {
      // Resolve the charge to refund. For a subscription the Checkout Session's
      // payment_intent is null (the charge is on the invoice), so pull it from the
      // subscription's latest invoice; for a one-time payment use the session.
      let paymentIntent: string | null = null;
      if (sub!.stripeSubscriptionId) {
        const s = await stripe.subscriptions.retrieve(
          sub!.stripeSubscriptionId,
          { expand: ["latest_invoice.payment_intent"] },
          { stripeAccount }
        );
        const inv = (s as any).latest_invoice;
        paymentIntent = inv?.payment_intent?.id ?? (typeof inv?.payment_intent === "string" ? inv.payment_intent : null);
      } else if (sub!.stripeCheckoutSessionId) {
        const session = await stripe.checkout.sessions.retrieve(sub!.stripeCheckoutSessionId, { stripeAccount });
        paymentIntent = session.payment_intent as string | null;
      }
      if (!paymentIntent) return NextResponse.json({ error: "No payment to refund" }, { status: 400 });
      await stripe.refunds.create({ payment_intent: paymentIntent }, { stripeAccount });
      // Also cancel any live subscription so it doesn't keep charging.
      if (sub!.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(sub!.stripeSubscriptionId, { stripeAccount }).catch(() => {});
      }
      await prisma.billingSubscription.update({ where: { id: sub!.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/billing-subscriptions/[id]] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not update the subscription" }, { status: 500 });
  }
}
