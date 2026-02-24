import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/marketplace/orders — List all orders
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;

    const orders = await (prisma as any).marketplaceOrder.findMany({
      where: clinicId ? { clinicId } : {},
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: { include: { product: { select: { id: true, name: true, imageUrl: true, isAffiliate: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Stats
    const stats = {
      total: orders.length,
      pending: orders.filter((o: any) => o.status === "pending").length,
      paid: orders.filter((o: any) => o.status === "paid").length,
      processing: orders.filter((o: any) => o.status === "processing").length,
      shipped: orders.filter((o: any) => o.status === "shipped").length,
      delivered: orders.filter((o: any) => o.status === "delivered").length,
      cancelled: orders.filter((o: any) => o.status === "cancelled").length,
      totalRevenue: orders.filter((o: any) => ["paid", "processing", "shipped", "delivered"].includes(o.status)).reduce((s: number, o: any) => s + o.total, 0),
      affiliateOrders: orders.filter((o: any) => o.items?.some((i: any) => i.isAffiliate)).length,
    };

    return NextResponse.json({ orders, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/marketplace/orders — Update order status, tracking, notes
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const updateData: any = {};
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "shipped") updateData.shippedAt = new Date();
      if (body.status === "delivered") updateData.deliveredAt = new Date();
      if (body.status === "cancelled") updateData.cancelledAt = new Date();
      if (body.status === "paid") updateData.paidAt = new Date();
    }
    if (body.trackingNumber !== undefined) updateData.trackingNumber = body.trackingNumber;
    if (body.trackingUrl !== undefined) updateData.trackingUrl = body.trackingUrl;
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;

    const order = await (prisma as any).marketplaceOrder.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } },
        items: true,
      },
    });

    return NextResponse.json({ order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
