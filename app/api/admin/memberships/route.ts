import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getClinicContext, getClinicContextFromSession, getDefaultClinic } from "@/lib/clinic-context";
import { stripe } from "@/lib/stripe";
import { sendTemplatedEmail } from "@/lib/email-templates";
import { notifyPatient } from "@/lib/notify-patient";

async function resolveClinicContext() {
  let ctx = await getClinicContext();
  if (!ctx.clinicId) ctx = await getClinicContextFromSession();
  if (!ctx.clinicId) {
    const clinic = await getDefaultClinic();
    if (clinic) ctx = { ...ctx, clinicId: clinic.id };
  }
  return ctx;
}

export async function GET() {
  try {
    const { clinicId, userRole } = await resolveClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const where: any = {};
    if (clinicId) where.clinicId = clinicId;
    const plans = await (prisma as any).membershipPlan.findMany({
      where,
      include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(plans);
  } catch (error: any) {
    console.error("[memberships GET]", error);
    return NextResponse.json({ error: "Failed to fetch memberships" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clinicId, userRole } = await resolveClinicContext();
    if (!userRole || !["SUPERADMIN", "ADMIN"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!clinicId) return NextResponse.json({ error: "No clinic found" }, { status: 400 });

    const body = await request.json();
    const { name, description, price, interval, isFree, features, patientId, patientScope } = body;

    if (!name) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (patientScope === "specific" && !patientId) {
      return NextResponse.json({ error: "Please select a patient" }, { status: 400 });
    }

    const finalPrice = isFree ? 0 : (price || 0);
    const resolvedPatientId = patientScope === "specific" && patientId ? patientId : null;

    // Create Stripe recurring product + price
    let stripeProductId: string | undefined;
    let stripePriceId: string | undefined;
    if (!isFree && finalPrice > 0 && process.env.STRIPE_SECRET_KEY) {
      try {
        const intervalMap: Record<string, string> = { MONTHLY: "month", WEEKLY: "week", YEARLY: "year" };
        const product = await stripe.products.create({
          name,
          description: description || `Membership plan — ${name}`,
          metadata: { clinicId: clinicId!, patientScope: patientScope || "none", source: "membership_plan" },
        });
        stripeProductId = product.id;
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(finalPrice * 100),
          currency: "gbp",
          recurring: { interval: intervalMap[interval || "MONTHLY"] as any },
          metadata: { clinicId: clinicId!, patientScope: patientScope || "none" },
        });
        stripePriceId = stripePrice.id;
      } catch (err: any) {
        console.error("[memberships POST] Stripe error:", err.message);
      }
    }

    const plan = await (prisma as any).membershipPlan.create({
      data: {
        clinicId,
        ...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
        name,
        description: description || null,
        price: finalPrice,
        interval: interval || "MONTHLY",
        isFree: isFree || false,
        features: features || [],
        patientScope: patientScope || "none",
        status: "ACTIVE",
        stripeProductId: stripeProductId || null,
        stripePriceId: stripePriceId || null,
      },
      include: { patient: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    // Send membership notification via patient's preferred channel
    if (plan.patient?.id) {
      const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
      const intervalLabels: Record<string, string> = { MONTHLY: 'Monthly', WEEKLY: 'Weekly', YEARLY: 'Yearly' };
      notifyPatient({
        patientId: plan.patient.id,
        emailTemplateSlug: 'MEMBERSHIP_CREATED',
        emailVars: {
          planName: plan.name,
          planPrice: plan.isFree ? 'Free' : `£${plan.price.toFixed(2)}`,
          planInterval: intervalLabels[plan.interval] || plan.interval,
          planFeatures: (plan.features || []).join(', '),
          portalUrl: `${BASE}/dashboard`,
        },
        plainMessage: `You have been assigned the ${plan.name} membership plan${plan.isFree ? ' (Free)' : ` at £${plan.price.toFixed(2)}/${plan.interval.toLowerCase()}`}. Log in to your portal to get started!`,
      }).catch(err => console.error('[memberships] notification error:', err));
    }

    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("[memberships POST]", error);
    return NextResponse.json({ error: "Failed to create membership" }, { status: 500 });
  }
}
