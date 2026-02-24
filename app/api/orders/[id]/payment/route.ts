import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-12-15.clover'
});

// POST - Create payment intent for order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const userId = (session.user as any).id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true, email: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true
      }
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check access - customers can only pay for their own orders
    if (user.role === 'PATIENT' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check order is in payable state
    if (!['DRAFT', 'PENDING_PAYMENT'].includes(order.status)) {
      return NextResponse.json({ error: 'Order cannot be paid in current status' }, { status: 400 });
    }
    
    // If payment intent already exists, return it
    if (order.stripePaymentIntentId) {
      const existingIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
      if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
        return NextResponse.json({
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id,
          amount: order.totalAmount
        });
      }
    }
    
    // Create new payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to pence
      currency: order.currency.toLowerCase(),
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        clinicId: order.clinicId
      },
      receipt_email: order.customer.email,
      description: `Order ${order.orderNumber}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    // Update order with payment intent ID and status
    await prisma.order.update({
      where: { id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING_PAYMENT'
      }
    });
    
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.totalAmount
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}

// PUT - Confirm payment success
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    const { paymentIntentId } = body;
    
    const order = await prisma.order.findUnique({
      where: { id }
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    if (!paymentIntentId || order.stripePaymentIntentId !== paymentIntentId) {
      return NextResponse.json({ error: 'Invalid payment intent' }, { status: 400 });
    }
    
    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }
    
    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: order.type === 'SERVICE' ? 'PAID' : 'PROCESSING',
        stripeReceiptUrl: paymentIntent.latest_charge 
          ? (typeof paymentIntent.latest_charge === 'string' 
              ? undefined 
              : (paymentIntent.latest_charge as any).receipt_url)
          : undefined
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
    
    return NextResponse.json(updatedOrder);
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
