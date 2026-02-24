import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

/**
 * POST /api/patient/marketplace/checkout — Create order from cart items
 * body: { items: [{ productId, quantity }], shippingInfo?, useCredits?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser();
  if (!effectiveUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = effectiveUser.userId;
    const _u = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } }); const clinicId = _u?.clinicId || null;

    const { items, shippingInfo, useCredits } = await req.json();
    if (!items || !items.length) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Fetch products
    const productIds = items.map((i: any) => i.productId);
    const products = await (prisma as any).marketplaceProduct.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== items.length) {
      return NextResponse.json({ error: "Some products are unavailable" }, { status: 400 });
    }

    // Build order items + calculate totals
    let subtotal = 0;
    let shippingTotal = 0;
    let vatTotal = 0;
    const orderItems: any[] = [];
    const affiliateItems: any[] = [];

    for (const cartItem of items) {
      const product = products.find((p: any) => p.id === cartItem.productId);
      if (!product) continue;

      const qty = cartItem.quantity || 1;
      const unitPrice = product.price;
      const totalPrice = unitPrice * qty;

      // Calculate VAT for this item
      const vatRate = product.vatRate || 20;
      const vatAmount = product.vatIncluded
        ? totalPrice - totalPrice / (1 + vatRate / 100)
        : totalPrice * vatRate / 100;

      subtotal += totalPrice;
      vatTotal += vatAmount;

      // Shipping for physical products
      if (!product.isDigital && !product.isAffiliate) {
        const itemShipping = product.shippingCost || 0;
        shippingTotal += itemShipping * qty;
      }

      // Check stock
      if (product.trackStock && product.stockQuantity != null) {
        if (product.stockQuantity < qty) {
          return NextResponse.json({ error: `${product.name} is out of stock` }, { status: 400 });
        }
      }

      const itemData = {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice,
        totalPrice,
        vatAmount: parseFloat(vatAmount.toFixed(2)),
        isAffiliate: product.isAffiliate || false,
        affiliateUrl: product.affiliateUrl || null,
        affiliateCommission: product.affiliateCommission || null,
      };

      if (product.isAffiliate) {
        affiliateItems.push(itemData);
      }
      orderItems.push(itemData);
    }

    // Check free shipping threshold
    const maxFreeShippingOver = Math.min(
      ...products.filter((p: any) => p.freeShippingOver).map((p: any) => p.freeShippingOver)
    );
    if (maxFreeShippingOver && subtotal >= maxFreeShippingOver) {
      shippingTotal = 0;
    }

    // Credits discount
    let creditsUsed = 0;
    let creditsValue = 0;
    if (useCredits && useCredits > 0) {
      const progress = await (prisma as any).patientProgress.findUnique({ where: { patientId: userId } });
      const available = progress?.bprCredits || 0;
      creditsUsed = Math.min(useCredits, available);
      creditsValue = creditsUsed * 0.01; // 1 credit = £0.01
    }

    const total = Math.max(0, subtotal + shippingTotal - creditsValue);

    // Generate order number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await (prisma as any).marketplaceOrder.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    const orderNumber = `BPR-${today}-${String(count + 1).padStart(3, "0")}`;

    // Determine if order needs Stripe payment
    const needsPayment = total > 0;
    const hasOnlyAffiliates = orderItems.every((i: any) => i.isAffiliate);

    // For affiliate-only orders, mark as paid immediately (no actual payment needed)
    const status = hasOnlyAffiliates ? "paid" : needsPayment ? "pending" : "paid";

    // Create order
    const order = await (prisma as any).marketplaceOrder.create({
      data: {
        clinicId,
        patientId: userId,
        orderNumber,
        status,
        paymentMethod: hasOnlyAffiliates ? "affiliate" : needsPayment ? "stripe" : "credits",
        subtotal: parseFloat(subtotal.toFixed(2)),
        shippingTotal: parseFloat(shippingTotal.toFixed(2)),
        vatTotal: parseFloat(vatTotal.toFixed(2)),
        creditsUsed,
        creditsValue: parseFloat(creditsValue.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        shippingName: shippingInfo?.name || null,
        shippingAddress: shippingInfo?.address || null,
        shippingCity: shippingInfo?.city || null,
        shippingPostcode: shippingInfo?.postcode || null,
        shippingCountry: shippingInfo?.country || "UK",
        shippingPhone: shippingInfo?.phone || null,
        customerNotes: shippingInfo?.notes || null,
        paidAt: status === "paid" ? new Date() : null,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Deduct credits
    if (creditsUsed > 0) {
      await (prisma as any).patientProgress.update({
        where: { patientId: userId },
        data: { bprCredits: { decrement: creditsUsed } },
      });
    }

    // Deduct stock for own products
    for (const item of orderItems) {
      const product = products.find((p: any) => p.id === item.productId);
      if (product?.trackStock && product.stockQuantity != null && !product.isAffiliate) {
        await (prisma as any).marketplaceProduct.update({
          where: { id: product.id },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    // If needs Stripe payment, create checkout session
    let stripeUrl = null;
    if (needsPayment && !hasOnlyAffiliates) {
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" as any });

        const lineItems = orderItems.filter((i: any) => !i.isAffiliate).map((item: any) => ({
          price_data: {
            currency: "gbp",
            product_data: { name: item.productName },
            unit_amount: Math.round(item.unitPrice * 100),
          },
          quantity: item.quantity,
        }));

        if (shippingTotal > 0) {
          lineItems.push({
            price_data: {
              currency: "gbp",
              product_data: { name: "Shipping" },
              unit_amount: Math.round(shippingTotal * 100),
            },
            quantity: 1,
          });
        }

        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: lineItems,
          success_url: `${process.env.NEXTAUTH_URL || "https://bpr.rehab"}/dashboard/marketplace?order=${order.id}&success=true`,
          cancel_url: `${process.env.NEXTAUTH_URL || "https://bpr.rehab"}/dashboard/marketplace?order=${order.id}&cancelled=true`,
          metadata: { orderId: order.id, orderNumber },
        });

        // Update order with Stripe session ID
        await (prisma as any).marketplaceOrder.update({
          where: { id: order.id },
          data: { stripeSessionId: checkoutSession.id },
        });

        stripeUrl = checkoutSession.url;
      } catch (stripeErr: any) {
        console.error("[marketplace checkout] Stripe error:", stripeErr.message);
      }
    }

    return NextResponse.json({
      order,
      stripeUrl,
      affiliateItems: affiliateItems.map((i: any) => ({
        productName: i.productName,
        affiliateUrl: i.affiliateUrl,
      })),
    });
  } catch (err: any) {
    console.error("[marketplace checkout] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
