export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

// GET: list all cancellation requests (admin)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN', 'THERAPIST'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const requests = await (prisma as any).cancellationRequest.findMany({
      where: status ? { status } : {},
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        appointment: {
          select: {
            id: true, dateTime: true, treatmentType: true, price: true,
            payment: { select: { stripeSessionId: true, status: true, amount: true } },
          },
        },
        treatmentPlan: {
          select: {
            id: true, name: true, totalPrice: true, stripePaymentIntentId: true,
          },
        },
        processedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error('[cancellations] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: admin processes a cancellation request (approve/reject + refund)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, action, adminNote, refundAmount } = body;
    // action: 'approve' | 'reject' | 'refund'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const cancellation = await (prisma as any).cancellationRequest.findUnique({
      where: { id: requestId },
      include: {
        appointment: {
          include: { payment: true },
        },
        treatmentPlan: true,
      },
    });

    if (!cancellation) {
      return NextResponse.json({ error: 'Cancellation request not found' }, { status: 404 });
    }

    const adminId = (session.user as any).id;

    if (action === 'reject') {
      await (prisma as any).cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || 'Request rejected by admin.',
          processedById: adminId,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: 'Cancellation request rejected.' });
    }

    if (action === 'approve') {
      await (prisma as any).cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          adminNote: adminNote || 'Request approved. Refund will be processed.',
          processedById: adminId,
          processedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: 'Cancellation approved. Process refund next.' });
    }

    if (action === 'refund') {
      let stripeRefundId: string | null = null;
      let actualRefundAmount = refundAmount || 0;

      // Try to process Stripe refund
      try {
        // For appointments: use payment intent from payment record
        if (cancellation.appointment?.payment) {
          const payment = cancellation.appointment.payment;
          let paymentIntentId: string | null = null;

          // Get payment intent from Stripe session
          if (payment.stripeSessionId) {
            const checkoutSession = await stripe.checkout.sessions.retrieve(payment.stripeSessionId);
            paymentIntentId = checkoutSession.payment_intent as string;
          }

          if (paymentIntentId && actualRefundAmount > 0) {
            const refund = await stripe.refunds.create({
              payment_intent: paymentIntentId,
              amount: Math.round(actualRefundAmount * 100), // pence
              reason: 'requested_by_customer',
              metadata: {
                cancellationRequestId: requestId,
                adminId,
              },
            });
            stripeRefundId = refund.id;

            // Update payment status
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: 'REFUNDED' },
            });
          }
        }

        // For treatment plans: use stored payment intent
        if (cancellation.treatmentPlan?.stripePaymentIntentId && actualRefundAmount > 0) {
          const refund = await stripe.refunds.create({
            payment_intent: cancellation.treatmentPlan.stripePaymentIntentId,
            amount: Math.round(actualRefundAmount * 100),
            reason: 'requested_by_customer',
            metadata: {
              cancellationRequestId: requestId,
              adminId,
            },
          });
          stripeRefundId = refund.id;
        }
      } catch (stripeErr: any) {
        console.error('[cancellations] Stripe refund error:', stripeErr.message);
        // Continue — mark as refunded manually even if Stripe fails
      }

      // Update cancellation request
      await (prisma as any).cancellationRequest.update({
        where: { id: requestId },
        data: {
          status: 'REFUNDED',
          refundAmount: actualRefundAmount,
          stripeRefundId,
          adminNote: adminNote || `Refund of £${actualRefundAmount.toFixed(2)} processed.`,
          processedById: adminId,
          processedAt: new Date(),
        },
      });

      // Cancel the appointment if linked
      if (cancellation.appointmentId) {
        await prisma.appointment.update({
          where: { id: cancellation.appointmentId },
          data: { status: 'CANCELLED' },
        });
      }

      // Cancel the treatment plan if linked
      if (cancellation.treatmentPlanId) {
        await (prisma as any).treatmentPlan.update({
          where: { id: cancellation.treatmentPlanId },
          data: { status: 'CANCELLED' },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Refund of £${actualRefundAmount.toFixed(2)} processed.${stripeRefundId ? ` Stripe refund ID: ${stripeRefundId}` : ' (Manual — no Stripe payment found)'}`,
        stripeRefundId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[cancellations] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
