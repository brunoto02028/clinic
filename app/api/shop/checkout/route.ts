// app/api/shop/checkout/route.ts — Public shop checkout (no BPR patient required)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

// Where Stripe sends the buyer back to. Keyed, never a URL taken from the
// request body — an unchecked redirect target is an open redirect.
const RETURN_PATHS: Record<string, { success: string; cancel: string }> = {
  shop: { success: "/shop", cancel: "/shop" },
  book: { success: "/beyond-pain/thank-you", cancel: "/beyond-pain/buy" },
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const { items, shippingInfo, email, returnTo } = await req.json();
    if (!items?.length) return NextResponse.json({ error: "No items" }, { status: 400 });

    // Validate contact
    const contactEmail = email || session?.user?.email;
    if (!contactEmail) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const productIds = items.map((i: any) => i.productId);
    const products = await (prisma as any).marketplaceProduct.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== items.length) {
      return NextResponse.json({ error: "Some products unavailable" }, { status: 400 });
    }

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
      const vatRate = product.vatRate || 20;
      const vatAmount = product.vatIncluded
        ? totalPrice - totalPrice / (1 + vatRate / 100)
        : totalPrice * vatRate / 100;

      subtotal += totalPrice;
      vatTotal += vatAmount;
      if (!product.isDigital && !product.isAffiliate) shippingTotal += (product.shippingCost || 0) * qty;

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
      orderItems.push(itemData);
      if (product.isAffiliate) affiliateItems.push(itemData);
    }

    const hasOnlyAffiliates = orderItems.every((i: any) => i.isAffiliate);

    // Free shipping threshold — same rule as the patient checkout, so both
    // charge the same for the same basket.
    const thresholds = products
      .filter((p: any) => p.freeShippingOver)
      .map((p: any) => p.freeShippingOver);
    if (thresholds.length && subtotal >= Math.min(...thresholds)) shippingTotal = 0;

    // No card surcharge: passing the processor fee to a consumer is banned in
    // the UK, and Stripe only ever charged unitPrice + shipping anyway — adding
    // it here inflated the stored total above the money actually received.
    const total = parseFloat((subtotal + shippingTotal).toFixed(2));
    const status = hasOnlyAffiliates ? "paid" : total === 0 ? "paid" : "pending";

    // Generate order number
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count = await (prisma as any).marketplaceOrder.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    const orderNumber = `BPR-SHOP-${today}-${String(count + 1).padStart(3, "0")}`;

    const order = await (prisma as any).marketplaceOrder.create({
      data: {
        patientId: userId,
        // Guests have no account, so the order itself has to carry the contact
        // details and the clinic — without clinicId it never shows in admin.
        customerEmail: contactEmail,
        customerName: shippingInfo?.name || null,
        clinicId: products[0]?.clinicId || null,
        orderNumber,
        status,
        paymentMethod: hasOnlyAffiliates ? "affiliate" : "stripe",
        subtotal: parseFloat(subtotal.toFixed(2)),
        shippingTotal: parseFloat(shippingTotal.toFixed(2)),
        vatTotal: parseFloat(vatTotal.toFixed(2)),
        creditsUsed: 0,
        creditsValue: 0,
        total,
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

    // Stripe for non-affiliate paid orders
    let stripeUrl = null;
    if (!hasOnlyAffiliates && total > 0) {
      try {
        const BASE = process.env.NEXTAUTH_URL || "https://bpr.clinic";
        const ret = RETURN_PATHS[returnTo] || RETURN_PATHS.shop;
        const Stripe = (await import("stripe")).default;
        const _stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripe = _stripeKey ? new Stripe(_stripeKey, { apiVersion: "2024-06-20" }) : null;
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
            price_data: { currency: "gbp", product_data: { name: "Shipping" }, unit_amount: Math.round(shippingTotal * 100) },
            quantity: 1,
          });
        }
        const checkoutSession = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: lineItems,
          customer_email: contactEmail,
          success_url: `${BASE}${ret.success}?order=${order.id}&success=true`,
          cancel_url: `${BASE}${ret.cancel}?cancelled=true`,
          metadata: { orderId: order.id, orderNumber },
        });
        await (prisma as any).marketplaceOrder.update({
          where: { id: order.id },
          data: { stripeSessionId: checkoutSession.id },
        });
        stripeUrl = checkoutSession.url;
      } catch (stripeErr: any) {
        console.error("[shop checkout] Stripe error:", stripeErr.message);
      }
    }

    return NextResponse.json({
      order: { id: order.id, orderNumber: order.orderNumber, total: order.total, status: order.status },
      stripeUrl,
      affiliateItems: affiliateItems.map((i: any) => ({ productName: i.productName, affiliateUrl: i.affiliateUrl })),
    });
  } catch (err: any) {
    console.error("[shop checkout]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
