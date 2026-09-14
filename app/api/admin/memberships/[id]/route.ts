import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { stripe } from "@/lib/stripe";
import { getCardFeePercent, applyCardFee } from "@/lib/card-fee";

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, interval, isFree, features, patientId, patientScope, status, sessionDiscount } = body;

    // Resolve patientId
    let resolvedPatientId: string | null | undefined = undefined;
    if (patientScope !== undefined) {
      resolvedPatientId = patientScope === "specific" && patientId ? patientId : null;
    }

    const existing = await (prisma as any).membershipPlan.findUnique({
      where: { id: params.id },
      select: { stripeProductId: true, stripePriceId: true, status: true, price: true, isFree: true, interval: true, name: true },
    });

    // Stripe restore if reactivating
    let stripeRestored = false;
    if (status === "ACTIVE" && existing?.status === "CANCELLED" && existing?.stripeProductId && process.env.STRIPE_SECRET_KEY) {
      try {
        await stripe.products.update(existing.stripeProductId, { active: true });
        if (existing.stripePriceId) await stripe.prices.update(existing.stripePriceId, { active: true });
        stripeRestored = true;
      } catch (err: any) {
        console.error("[memberships PUT] Stripe restore error:", err.message);
      }
    }

    // Resolve the fee-inclusive price the same way it's set on create — same
    // reasoning as service-packages: the DB/display price and the Stripe
    // charge must always be the same number.
    const finalPrice = price !== undefined ? (isFree ? 0 : applyCardFee(price, await getCardFeePercent())) : undefined;
    const willBeFree = isFree !== undefined ? isFree : existing?.isFree;
    const effectivePrice = finalPrice !== undefined ? finalPrice : existing?.price;
    const effectiveInterval = interval !== undefined ? interval : existing?.interval;

    // Stripe: a price/interval change on an existing subscription product
    // needs a NEW Stripe Price (prices are immutable) — deactivate the old
    // one so it stops offering it, same pattern as service-packages' PUT.
    let newStripePriceId: string | undefined;
    if (process.env.STRIPE_SECRET_KEY && !willBeFree && effectivePrice > 0 && existing) {
      const priceChanged = finalPrice !== undefined && finalPrice !== existing.price;
      const intervalChanged = interval !== undefined && interval !== existing.interval;
      try {
        if (existing.stripeProductId && (priceChanged || intervalChanged)) {
          if (existing.stripePriceId) await stripe.prices.update(existing.stripePriceId, { active: false });
          const intervalMap: Record<string, string> = { MONTHLY: "month", WEEKLY: "week", YEARLY: "year" };
          const newPrice = await stripe.prices.create({
            product: existing.stripeProductId,
            unit_amount: Math.round(effectivePrice * 100),
            currency: "gbp",
            recurring: { interval: intervalMap[effectiveInterval || "MONTHLY"] as any },
            metadata: { source: "membership_plan", planId: params.id },
          });
          newStripePriceId = newPrice.id;
        } else if (!existing.stripeProductId) {
          // Was free (or Stripe wasn't configured yet) and now has a real
          // price — create the product for the first time.
          const product = await stripe.products.create({
            name: name || existing.name,
            description: description || `Membership plan — ${name || existing.name}`,
            metadata: { source: "membership_plan", planId: params.id },
          });
          const intervalMap: Record<string, string> = { MONTHLY: "month", WEEKLY: "week", YEARLY: "year" };
          const newPrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(effectivePrice * 100),
            currency: "gbp",
            recurring: { interval: intervalMap[effectiveInterval || "MONTHLY"] as any },
            metadata: { source: "membership_plan", planId: params.id },
          });
          newStripePriceId = newPrice.id;
          await (prisma as any).membershipPlan.update({ where: { id: params.id }, data: { stripeProductId: product.id } });
        }
      } catch (err: any) {
        console.error("[memberships PUT] Stripe price update error:", err.message);
      }
    }

    const plan = await (prisma as any).membershipPlan.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(finalPrice !== undefined && { price: finalPrice }),
        ...(interval !== undefined && { interval }),
        ...(isFree !== undefined && { isFree }),
        ...(features !== undefined && { features }),
        ...(patientScope !== undefined && { patientScope }),
        ...(status !== undefined && { status }),
        ...(resolvedPatientId !== undefined && { patientId: resolvedPatientId }),
        ...(sessionDiscount !== undefined && { sessionDiscount }),
        ...(newStripePriceId !== undefined && { stripePriceId: newStripePriceId }),
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return NextResponse.json({ ...plan, stripeRestored });
  } catch (error: any) {
    console.error("[memberships PUT]", error);
    return NextResponse.json({ error: "Failed to update membership" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await (prisma as any).membershipPlan.findUnique({
      where: { id: params.id },
      select: { stripeProductId: true, stripePriceId: true },
    });

    let stripeArchived = false;
    let stripeArchiveError: string | undefined;
    if (plan?.stripeProductId && process.env.STRIPE_SECRET_KEY) {
      try {
        if (plan.stripePriceId) await stripe.prices.update(plan.stripePriceId, { active: false });
        await stripe.products.update(plan.stripeProductId, { active: false });
        stripeArchived = true;
      } catch (err: any) {
        stripeArchiveError = err.message;
      }
    }

    await (prisma as any).membershipPlan.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, stripeArchived, stripeArchiveError, hadStripeProduct: !!plan?.stripeProductId });
  } catch (error: any) {
    console.error("[memberships DELETE]", error);
    return NextResponse.json({ error: "Failed to delete membership" }, { status: 500 });
  }
}
