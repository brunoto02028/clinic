import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/patient/membership/subscribe
 * Subscribe the patient to a membership plan.
 * - Free plans: activate immediately
 * - Paid plans: create Stripe Checkout session and return URL
 */
export async function POST(request: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, clinicId: true } });
    const userEmail = user?.email || '';
    const clinicId = user?.clinicId || null;
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    // Fetch the plan
    const plan = await (prisma as any).membershipPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.status !== "ACTIVE") {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    // Check if patient already has an active subscription
    const existingSub = await (prisma as any).patientSubscription.findFirst({
      where: { patientId: userId, status: { in: ["ACTIVE", "TRIALING"] } },
    });

    if (existingSub) {
      return NextResponse.json({ error: "You already have an active subscription. Please cancel it first to switch plans." }, { status: 400 });
    }

    // ── Free plan: activate immediately ──
    if (plan.isFree || plan.price === 0) {
      const subscription = await (prisma as any).patientSubscription.create({
        data: {
          clinicId: clinicId || plan.clinicId,
          patientId: userId,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
        },
      });

      return NextResponse.json({
        subscription,
        planName: plan.name,
        message: "Free membership activated successfully",
      });
    }

    // ── Paid plan: create Stripe Checkout ──
    if (!plan.stripePriceId || !process.env.STRIPE_SECRET_KEY) {
      // No Stripe configured — activate directly (manual payment assumed)
      const subscription = await (prisma as any).patientSubscription.create({
        data: {
          clinicId: clinicId || plan.clinicId,
          patientId: userId,
          planId: plan.id,
          status: "ACTIVE",
          startDate: new Date(),
        },
      });

      return NextResponse.json({
        subscription,
        planName: plan.name,
        message: "Membership activated (manual payment mode)",
      });
    }

    // Create Stripe Checkout Session for recurring subscription
    const BASE_URL = process.env.NEXTAUTH_URL || "https://bpr.rehab";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: userEmail,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        patientId: userId,
        planId: plan.id,
        clinicId: clinicId || plan.clinicId,
        type: "membership_subscription",
      },
      success_url: `${BASE_URL}/dashboard/membership?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/dashboard/membership?cancelled=true`,
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error: any) {
    console.error("[patient/membership/subscribe] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to subscribe" }, { status: 500 });
  }
}
