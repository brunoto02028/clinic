export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getActor, assertRecordAccess, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { resolveConnectedAccount } from "@/lib/connect";
import { validateBillingPlan, toStripeRecurring, type BillingPlanInput } from "@/lib/billing";
import type { BillingInterval } from "@prisma/client";

async function loadOwned(actor: Awaited<ReturnType<typeof getActor>>, id: string) {
  const plan = await prisma.billingPlan.findUnique({ where: { id } });
  assertRecordAccess(actor!, { clinicId: plan?.clinicId ?? null });
  return plan!;
}

// GET — one plan.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);
    const plan = await loadOwned(actor, params.id);
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/billing-plans/[id]] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// PATCH — edit name/description (Stripe product) and, if amount/interval change,
// archive the old price and create a new one on the connected account (prices
// are immutable). Both on the connected account.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);
    const plan = await loadOwned(actor, params.id);
    const stripeAccount = await resolveConnectedAccount(clinicId);

    const body = await request.json().catch(() => null);
    const nextName = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : plan.name;
    const nextDesc = "description" in (body || {}) ? (body.description ?? null) : plan.description;
    const nextAmount = typeof body?.amountCents === "number" ? body.amountCents : plan.amountCents;
    const nextInterval = (body?.interval as BillingInterval) || plan.interval;

    const input: BillingPlanInput = { name: nextName, description: nextDesc, amountCents: nextAmount, currency: "GBP", interval: nextInterval };
    const vErr = validateBillingPlan(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // Update the Stripe product's descriptive fields.
    if (plan.stripeProductId) {
      await stripe.products.update(plan.stripeProductId, { name: nextName, description: nextDesc ?? undefined }, { stripeAccount });
    }

    let stripePriceId = plan.stripePriceId;
    const priceChanged = nextAmount !== plan.amountCents || nextInterval !== plan.interval;
    if (priceChanged && plan.stripeProductId) {
      const recurring = toStripeRecurring(nextInterval);
      const price = await stripe.prices.create(
        { product: plan.stripeProductId, unit_amount: nextAmount, currency: "gbp", ...(recurring ? { recurring } : {}) },
        { stripeAccount }
      );
      if (plan.stripePriceId) {
        await stripe.prices.update(plan.stripePriceId, { active: false }, { stripeAccount }).catch(() => {});
      }
      stripePriceId = price.id;
    }

    const updated = await prisma.billingPlan.update({
      where: { id: plan.id },
      data: { name: nextName, description: nextDesc, amountCents: nextAmount, interval: nextInterval, stripePriceId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/billing-plans/[id]] PATCH error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not update the plan" }, { status: 500 });
  }
}

// DELETE — archive the plan (status ARCHIVED) and deactivate its Stripe price
// on the connected account. Existing subscriptions are unaffected.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);
    const plan = await loadOwned(actor, params.id);
    const stripeAccount = await resolveConnectedAccount(clinicId);

    if (plan.stripePriceId) {
      await stripe.prices.update(plan.stripePriceId, { active: false }, { stripeAccount }).catch(() => {});
    }
    if (plan.stripeProductId) {
      await stripe.products.update(plan.stripeProductId, { active: false }, { stripeAccount }).catch(() => {});
    }
    await prisma.billingPlan.update({ where: { id: plan.id }, data: { status: "ARCHIVED" } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/billing-plans/[id]] DELETE error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not archive the plan" }, { status: 500 });
  }
}
