import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Generate unique order number
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BPR-${year}-`;
  
  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' }
  });
  
  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.orderNumber.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// GET - List orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    let whereClause: any = {};
    
    // Patients can only see their own orders
    if (user.role === 'PATIENT') {
      whereClause.customerId = user.id;
    } else if (user.clinicId) {
      whereClause.clinicId = user.clinicId;
      if (customerId) {
        whereClause.customerId = customerId;
      }
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        processedBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        footScan: {
          select: { id: true, scanNumber: true, status: true }
        },
        appointment: {
          select: { id: true, dateTime: true, treatmentType: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(orders);
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      customerId,
      type,
      items,
      shippingAddress,
      shippingMethod,
      footScanId,
      appointmentId,
      customerNotes,
      discountCode,
      discountAmount = 0
    } = body;
    
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user || !user.clinicId) {
      return NextResponse.json({ error: 'User or clinic not found' }, { status: 404 });
    }
    
    // Determine customer - if patient creating order, use their ID
    const actualCustomerId = user.role === 'PATIENT' ? user.id : customerId;
    
    if (!actualCustomerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }
    
    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Type and items are required' }, { status: 400 });
    }
    
    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += (item.unitPrice || 0) * (item.quantity || 1);
    }
    
    const taxRate = 0.20; // 20% UK VAT
    const taxAmount = subtotal * taxRate;
    const shippingAmount = type === 'PHYSICAL' ? (shippingMethod === 'express' ? 12.99 : 4.99) : 0;
    const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;
    
    const orderNumber = await generateOrderNumber();
    
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clinicId: user.clinicId,
        customerId: actualCustomerId,
        type,
        status: 'DRAFT',
        items,
        subtotal,
        taxRate,
        taxAmount,
        shippingAmount,
        discountAmount,
        discountCode,
        totalAmount,
        currency: 'GBP',
        shippingAddress,
        shippingMethod,
        footScanId,
        appointmentId,
        customerNotes
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });
    
    return NextResponse.json(order, { status: 201 });
    
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
