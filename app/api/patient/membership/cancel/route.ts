import { patientGate } from "@/lib/patient-gate";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * POST /api/patient/membership/cancel
 * Cancel the patient's active subscription.
 * - Stripe subscriptions: cancel at period end
 * - Free/manual: cancel immediately
 */
export async function POST() {
  // Consentimento e plano valem no servidor, não só na tela (auditoria de paridade, 24/09/2026).
  const __gate = await patientGate({ skipConsent: true });
  if (__gate.response) return __gate.response;

  try {
    const effectiveUser = await getEffectiveUser();
    if (!effectiveUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = effectiveUser.userId;

    const activeSub = await (prisma as any).patientSubscription.findFirst({
      where: { patientId: userId, status: { in: ["ACTIVE", "TRIALING"] } },
      include: { plan: true },
    });

    if (!activeSub) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    // If Stripe subscription, cancel at period end
    if (activeSub.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        await stripe.subscriptions.update(activeSub.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        await (prisma as any).patientSubscription.update({
          where: { id: activeSub.id },
          data: { cancelAtPeriodEnd: true },
        });
        return NextResponse.json({
          message: "Subscription will cancel at the end of the current billing period",
          cancelAtPeriodEnd: true,
        });
      } catch (stripeErr: any) {
        console.error("[membership/cancel] Stripe error:", stripeErr.message);
      }
    }

    // Free or manual — cancel immediately
    await (prisma as any).patientSubscription.update({
      where: { id: activeSub.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        endDate: new Date(),
      },
    });

    return NextResponse.json({ message: "Subscription cancelled", cancelled: true });
  } catch (error: any) {
    console.error("[membership/cancel] Error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
