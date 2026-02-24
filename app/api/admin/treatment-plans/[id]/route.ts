import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, getClinicContextFromSession, getDefaultClinic } from "@/lib/clinic-context";
import { stripe } from "@/lib/stripe";

async function resolveClinicContext() {
  let ctx = await getClinicContext();
  if (!ctx.clinicId) ctx = await getClinicContextFromSession();
  if (!ctx.clinicId) {
    const clinic = await getDefaultClinic();
    if (clinic) ctx = { ...ctx, clinicId: clinic.id };
  }
  return ctx;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plan = await (prisma as any).treatmentPlan.findUnique({
      where: { id: params.id },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        therapist: { select: { id: true, firstName: true, lastName: true } },
        items: true,
        appointments: {
          select: { id: true, dateTime: true, status: true, treatmentType: true },
          orderBy: { dateTime: "desc" },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("Error fetching treatment plan:", error);
    return NextResponse.json({ error: "Failed to fetch treatment plan" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await getClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, status, totalPrice, isFree, isCombo, totalSessions, completedSessions, notes, endDate, patientId, patientScope } = body;

    // If restoring a CANCELLED plan, reactivate Stripe product/price
    let stripeRestored = false;
    let stripeRestoreError: string | undefined;
    if (status === "ACTIVE") {
      const existing = await (prisma as any).treatmentPlan.findUnique({
        where: { id: params.id },
        select: { stripeProductId: true, stripePriceId: true, status: true },
      });
      if (existing?.status === "CANCELLED" && existing?.stripeProductId && process.env.STRIPE_SECRET_KEY) {
        try {
          await stripe.products.update(existing.stripeProductId, { active: true });
          if (existing.stripePriceId) {
            await stripe.prices.update(existing.stripePriceId, { active: true });
          }
          stripeRestored = true;
        } catch (stripeErr: any) {
          console.error('[treatment-plans PUT] Stripe restore error:', stripeErr.message);
          stripeRestoreError = stripeErr.message;
        }
      }
    }

    // Resolve patientId based on scope
    let resolvedPatientId: string | null | undefined = undefined; // undefined = don't touch
    if (patientScope !== undefined) {
      if (patientScope === "specific" && patientId) {
        resolvedPatientId = patientId;
      } else {
        // 'none' or 'all' → clear the patient link
        resolvedPatientId = null;
      }
    }

    const plan = await (prisma as any).treatmentPlan.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(status !== undefined && { status }),
        ...(totalPrice !== undefined && { totalPrice }),
        ...(isFree !== undefined && { isFree }),
        ...(isCombo !== undefined && { isCombo }),
        ...(totalSessions !== undefined && { totalSessions }),
        ...(completedSessions !== undefined && { completedSessions }),
        ...(notes !== undefined && { notes }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(resolvedPatientId !== undefined && { patientId: resolvedPatientId }),
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: true,
      },
    });

    return NextResponse.json({ ...plan, stripeRestored, stripeRestoreError });
  } catch (error: any) {
    console.error("Error updating treatment plan:", error);
    return NextResponse.json({ error: "Failed to update treatment plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userRole } = await resolveClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch plan to get Stripe IDs before deleting
    const plan = await (prisma as any).treatmentPlan.findUnique({
      where: { id: params.id },
      select: { stripeProductId: true, stripePriceId: true },
    });

    // Archive product in Stripe (hard-delete not allowed if prices exist)
    let stripeArchived = false;
    let stripeArchiveError: string | undefined;
    if (plan?.stripeProductId && process.env.STRIPE_SECRET_KEY) {
      try {
        if (plan.stripePriceId) {
          await stripe.prices.update(plan.stripePriceId, { active: false });
        }
        await stripe.products.update(plan.stripeProductId, { active: false });
        stripeArchived = true;
      } catch (stripeErr: any) {
        console.error('[treatment-plans DELETE] Stripe error:', stripeErr.message);
        stripeArchiveError = stripeErr.message;
      }
    }

    await (prisma as any).treatmentPlan.delete({ where: { id: params.id } });
    return NextResponse.json({
      success: true,
      stripeArchived,
      stripeArchiveError,
      hadStripeProduct: !!plan?.stripeProductId,
    });
  } catch (error: any) {
    console.error("Error deleting treatment plan:", error);
    return NextResponse.json({ error: "Failed to delete treatment plan" }, { status: 500 });
  }
}
