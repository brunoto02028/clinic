import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET - Get single order
export async function GET(
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
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        processedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        footScan: true,
        appointment: {
          include: {
            therapist: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check access
    if (user.role === 'PATIENT' && order.customerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (user.role !== 'PATIENT' && user.clinicId !== order.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    return NextResponse.json(order);
    
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PUT/PATCH - Update order
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
    const userId = (session.user as any).id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true, canManageOrders: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });
    
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Check access
    if (user.clinicId !== existingOrder.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Patients can only cancel their own orders
    if (user.role === 'PATIENT') {
      if (existingOrder.customerId !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      // Only allow cancellation
      if (body.status && body.status !== 'CANCELLED') {
        return NextResponse.json({ error: 'Patients can only cancel orders' }, { status: 403 });
      }
      if (!['DRAFT', 'PENDING_PAYMENT'].includes(existingOrder.status)) {
        return NextResponse.json({ error: 'Cannot cancel order in current status' }, { status: 400 });
      }
      
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });
      return NextResponse.json(updatedOrder);
    }
    
    // Staff can update all fields
    const {
      status,
      items,
      shippingAddress,
      shippingMethod,
      trackingNumber,
      trackingUrl,
      shippedAt,
      deliveredAt,
      discountAmount,
      discountCode,
      customerNotes,
      internalNotes,
      stripePaymentIntentId,
      stripeInvoiceId,
      stripeReceiptUrl
    } = body;
    
    // Recalculate totals if items change
    let updateData: any = {};
    
    if (items) {
      let subtotal = 0;
      for (const item of items) {
        subtotal += (item.unitPrice || 0) * (item.quantity || 1);
      }
      const taxAmount = subtotal * existingOrder.taxRate;
      const totalAmount = subtotal + taxAmount + existingOrder.shippingAmount - (discountAmount ?? existingOrder.discountAmount);
      
      updateData = {
        items,
        subtotal,
        taxAmount,
        totalAmount
      };
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...updateData,
        ...(status !== undefined && { status }),
        ...(shippingAddress !== undefined && { shippingAddress }),
        ...(shippingMethod !== undefined && { shippingMethod }),
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(trackingUrl !== undefined && { trackingUrl }),
        ...(shippedAt !== undefined && { shippedAt: new Date(shippedAt) }),
        ...(deliveredAt !== undefined && { deliveredAt: new Date(deliveredAt) }),
        ...(discountAmount !== undefined && { discountAmount }),
        ...(discountCode !== undefined && { discountCode }),
        ...(customerNotes !== undefined && { customerNotes }),
        ...(internalNotes !== undefined && { internalNotes }),
        ...(stripePaymentIntentId !== undefined && { stripePaymentIntentId }),
        ...(stripeInvoiceId !== undefined && { stripeInvoiceId }),
        ...(stripeReceiptUrl !== undefined && { stripeReceiptUrl }),
        processedById: user.id
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        processedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
    
    return NextResponse.json(updatedOrder);
    
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export const PATCH = PUT;

// DELETE - Delete order (admin only)
export async function DELETE(
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
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Only admins can delete orders' }, { status: 403 });
    }
    
    const order = await prisma.order.findUnique({
      where: { id }
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    if (user.clinicId !== order.clinicId && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    await prisma.order.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
