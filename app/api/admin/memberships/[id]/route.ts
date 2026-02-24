import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { stripe } from "@/lib/stripe";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, price, interval, isFree, features, patientId, patientScope, status } = body;

    // Resolve patientId
    let resolvedPatientId: string | null | undefined = undefined;
    if (patientScope !== undefined) {
      resolvedPatientId = patientScope === "specific" && patientId ? patientId : null;
    }

    // Stripe restore if reactivating
    let stripeRestored = false;
    if (status === "ACTIVE") {
      const existing = await (prisma as any).membershipPlan.findUnique({
        where: { id: params.id },
        select: { stripeProductId: true, stripePriceId: true, status: true },
      });
      if (existing?.status === "CANCELLED" && existing?.stripeProductId && process.env.STRIPE_SECRET_KEY) {
        try {
          await stripe.products.update(existing.stripeProductId, { active: true });
          if (existing.stripePriceId) await stripe.prices.update(existing.stripePriceId, { active: true });
          stripeRestored = true;
        } catch (err: any) {
          console.error("[memberships PUT] Stripe restore error:", err.message);
        }
      }
    }

    const plan = await (prisma as any).membershipPlan.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: isFree ? 0 : price }),
        ...(interval !== undefined && { interval }),
        ...(isFree !== undefined && { isFree }),
        ...(features !== undefined && { features }),
        ...(patientScope !== undefined && { patientScope }),
        ...(status !== undefined && { status }),
        ...(resolvedPatientId !== undefined && { patientId: resolvedPatientId }),
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
