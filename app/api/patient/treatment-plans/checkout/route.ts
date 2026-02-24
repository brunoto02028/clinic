export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { getEffectiveUser } from '@/lib/get-effective-user';

export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const patientId = effectiveUser.userId;
    const body = await req.json();
    const { treatmentPlanId } = body;

    if (!treatmentPlanId) {
      return NextResponse.json({ error: 'treatmentPlanId is required' }, { status: 400 });
    }

    const plan = await (prisma as any).treatmentPlan.findUnique({
      where: { id: treatmentPlanId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: true,
      },
    });

    if (!plan) return NextResponse.json({ error: 'Treatment plan not found' }, { status: 404 });
    if (plan.patientId !== patientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (plan.isFree || plan.totalPrice === 0) return NextResponse.json({ error: 'This plan is free — no payment required' }, { status: 400 });

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://bpr.rehab';

    // Build line items description
    const itemsDesc = plan.items
      .map((i: any) => `${i.treatmentName} × ${i.sessions} session${i.sessions > 1 ? 's' : ''}`)
      .join(', ');

    // Use existing Stripe price if available, otherwise create inline
    let lineItems: any[];
    if (plan.stripePriceId) {
      lineItems = [{ price: plan.stripePriceId, quantity: 1 }];
    } else {
      lineItems = [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: plan.name,
            description: itemsDesc || `Treatment plan — ${plan.totalSessions} session${plan.totalSessions > 1 ? 's' : ''}`,
            metadata: { treatmentPlanId, source: 'treatment_plan' },
          },
          unit_amount: Math.round(plan.totalPrice * 100),
        },
        quantity: 1,
      }];
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: plan.patient?.email ?? undefined,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      line_items: lineItems,
      custom_fields: [
        {
          key: 'full_name',
          label: { type: 'custom', custom: 'Full Name' },
          type: 'text',
          optional: false,
        },
      ],
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: `By completing this payment you agree to our [Cancellation Policy](${origin}/cancellation-policy): Treatment plan cancellations require admin review. Once appointment slots are reserved, refunds are subject to our cancellation policy. Appointments cancelled within 48 hours of the scheduled time are non-refundable.`,
        },
        submit: {
          message: "Your payment is secured by Stripe. We'll send a confirmation email with your treatment plan details.",
        },
        after_submit: {
          message: 'Thank you! Your treatment plan is now active. Our team will contact you to schedule your sessions.',
        },
      },
      metadata: {
        treatmentPlanId,
        patientId,
        type: 'treatment_plan',
        planName: plan.name,
      },
      success_url: `${origin}/dashboard/treatment?payment=success&planId=${treatmentPlanId}`,
      cancel_url: `${origin}/dashboard/treatment?payment=cancelled`,
    });

    // Record that policy was accepted at checkout creation time
    await (prisma as any).treatmentPlan.update({
      where: { id: treatmentPlanId },
      data: { cancellationPolicyAcceptedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (err: any) {
    console.error('[treatment-plan-checkout] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
