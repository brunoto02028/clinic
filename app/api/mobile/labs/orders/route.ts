export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth-guard";
import { corsJson, corsPreflight } from "@/lib/mobile-cors";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) {
    return corsJson({ error: "Unauthorised" }, { status: 401 });
  }

  const orders = await prisma.labOrder.findMany({
    where: { patientId: payload.sub },
    include: {
      items: { include: { product: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return corsJson({ orders });
}

export async function POST(request: NextRequest) {
  const payload = getMobileUser(request);
  if (!payload) {
    return corsJson({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await request.json();
  const items: { productId: string; quantity: number }[] = body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return corsJson({ error: "items array is required" }, { status: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.labProduct.findMany({
    where: { id: { in: productIds }, isActive: true },
  });

  if (products.length !== productIds.length) {
    return corsJson(
      { error: "One or more products not found or inactive" },
      { status: 400 }
    );
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Generate order number: LB-YYYY-NNNNN
  const year = new Date().getFullYear();
  const lastOrder = await prisma.labOrder.findFirst({
    where: { orderNumber: { startsWith: `LB-${year}-` } },
    orderBy: { orderNumber: "desc" },
  });

  let seq = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.split("-")[2], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  const orderNumber = `LB-${year}-${String(seq).padStart(5, "0")}`;

  // Build line items and calculate totals
  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId)!;
    const quantity = Math.max(1, Math.floor(item.quantity));
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: product.retailPrice,
      total: product.retailPrice * quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);

  const order = await prisma.labOrder.create({
    data: {
      orderNumber,
      patientId: payload.sub,
      status: "BASKET",
      subtotal,
      total: subtotal,
      items: { create: lineItems },
      events: {
        create: { status: "BASKET", note: "Order created" },
      },
    },
    include: {
      items: { include: { product: true } },
      events: true,
    },
  });

  return corsJson({ order }, { status: 201 });
}
