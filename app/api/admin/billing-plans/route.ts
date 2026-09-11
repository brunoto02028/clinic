export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getActor, tenantWhere, accessErrorResponse, AccessError } from "@/lib/tenant-access";
import { assertNutritionAccess } from "@/lib/nutrition-access";
import { assertChargesEnabled } from "@/lib/connect";
import { validateBillingPlan, toStripeRecurring, type BillingPlanInput } from "@/lib/billing";
import type { BillingInterval } from "@prisma/client";

// GET — the tenant's billing plans. With ?studentId= also returns that
// student's billing subscriptions (for the admin status view).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await assertNutritionAccess(actor);

    const studentId = request.nextUrl.searchParams.get("studentId") || undefined;
    const plans = await prisma.billingPlan.findMany({
      where: { ...tenantWhere(actor) },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    const subscriptions = studentId
      ? await prisma.billingSubscription.findMany({
          where: { ...tenantWhere(actor), studentId },
          orderBy: { createdAt: "desc" },
        })
      : [];
    return NextResponse.json({ plans, subscriptions });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/billing-plans] GET error:", (err as any)?.message);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

// POST — create a billing plan. Product + price are created ON THE CONNECTED
// account (direct charges), never the BPR platform account.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const clinicId = await assertNutritionAccess(actor);
    const stripeAccount = await assertChargesEnabled(clinicId); // 409 if not onboarded

    const body = await request.json().catch(() => null);
    const input: BillingPlanInput = {
      name: typeof body?.name === "string" ? body.name.trim() : "",
      description: body?.description ?? null,
      amountCents: Number(body?.amountCents),
      currency: "GBP",
      interval: body?.interval as BillingInterval,
    };
    const vErr = validateBillingPlan(input);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // Create on the connected account.
    const product = await stripe.products.create(
      { name: input.name, ...(input.description ? { description: input.description } : {}) },
      { stripeAccount }
    );
    const recurring = toStripeRecurring(input.interval);
    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: input.amountCents,
        currency: "gbp",
        ...(recurring ? { recurring } : {}),
      },
      { stripeAccount }
    );

    const plan = await prisma.billingPlan.create({
      data: {
        clinicId,
        trainerId: actor.userId,
        name: input.name,
        description: input.description ?? null,
        amountCents: input.amountCents,
        currency: "GBP",
        interval: input.interval,
        stripeProductId: product.id,
        stripePriceId: price.id,
      },
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    if (err instanceof AccessError) return accessErrorResponse(err);
    console.error("[admin/billing-plans] POST error:", (err as any)?.message);
    return NextResponse.json({ error: "Could not create the plan" }, { status: 500 });
  }
}
