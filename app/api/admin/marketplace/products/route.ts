import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.marketplaceProduct.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Get clinic ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { clinic: true },
    });

    if (!user?.clinicId) {
      return NextResponse.json({ error: "No clinic found" }, { status: 400 });
    }

    // Parse numeric fields
    const price = parseFloat(body.price) || 0;
    const costPrice = body.costPrice ? parseFloat(body.costPrice) : null;
    const compareAtPrice = body.compareAtPrice ? parseFloat(body.compareAtPrice) : null;
    const vatRate = parseFloat(body.vatRate) || 20;
    const weight = body.weight ? parseFloat(body.weight) : null;
    const stockQuantity = body.stockQuantity ? parseInt(body.stockQuantity) : null;
    const lowStockAlert = parseInt(body.lowStockAlert) || 5;
    const shippingCost = parseFloat(body.shippingCost) || 0;
    const freeShippingOver = body.freeShippingOver ? parseFloat(body.freeShippingOver) : null;
    const creditsCost = parseInt(body.creditsCost) || 0;
    const creditsDiscount = parseInt(body.creditsDiscount) || 0;
    const sortOrder = parseInt(body.sortOrder) || 0;
    const affiliateCommission = body.affiliateCommission ? parseFloat(body.affiliateCommission) : null;

    // Calculate margin
    let marginPercent = null;
    if (!body.isAffiliate && costPrice && price > 0) {
      marginPercent = ((price - costPrice) / price) * 100;
    }

    // Generate slug from name
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Create Stripe product and price if needed
    let stripePriceId = null;
    let stripeProductId = null;

    if (!body.isAffiliate && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        
        // Create Stripe product
        const stripeProduct = await stripe.products.create({
          name: body.name,
          description: body.shortDescription || body.description,
          images: body.imageUrl ? [body.imageUrl] : [],
          metadata: {
            sku: body.sku || "",
            category: body.category,
          },
        });

        stripeProductId = stripeProduct.id;

        // Create Stripe price (in pence). The customer pays the listed price —
        // the processor fee comes out of the margin, never added on top.
        const priceInPence = Math.round(price * 100);

        const stripePrice = await stripe.prices.create({
          product: stripeProductId,
          unit_amount: priceInPence,
          currency: "gbp",
        });

        stripePriceId = stripePrice.id;
      } catch (stripeError: any) {
        console.error("Stripe error:", stripeError);
        // Continue without Stripe if it fails
      }
    }

    const product = await prisma.marketplaceProduct.create({
      data: {
        clinicId: user.clinicId,
        name: body.name,
        slug,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        category: body.category,
        price,
        costPrice,
        marginPercent,
        compareAtPrice,
        vatRate,
        vatIncluded: body.vatIncluded !== false,
        imageUrl: body.imageUrl || null,
        sku: body.sku || null,
        barcode: body.barcode || null,
        weight,
        stockQuantity,
        lowStockAlert,
        trackStock: body.trackStock === true,
        shippingCost,
        freeShippingOver,
        isDigital: body.isDigital === true,
        digitalFileUrl: body.digitalFileUrl || null,
        isAffiliate: body.isAffiliate === true,
        affiliateUrl: body.affiliateUrl || null,
        affiliateTag: body.affiliateTag || null,
        affiliateCommission,
        amazonAsin: body.amazonAsin || null,
        creditsCost,
        creditsDiscount,
        featured: body.featured === true,
        isActive: body.isActive !== false,
        sortOrder,
        stripePriceId,
        stripeProductId,
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Parse numeric fields
    const updates: any = {};
    
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.shortDescription !== undefined) updates.shortDescription = data.shortDescription || null;
    if (data.category !== undefined) updates.category = data.category;
    if (data.price !== undefined) updates.price = parseFloat(data.price) || 0;
    if (data.costPrice !== undefined) updates.costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
    if (data.compareAtPrice !== undefined) updates.compareAtPrice = data.compareAtPrice ? parseFloat(data.compareAtPrice) : null;
    if (data.vatRate !== undefined) updates.vatRate = parseFloat(data.vatRate) || 20;
    if (data.vatIncluded !== undefined) updates.vatIncluded = data.vatIncluded !== false;
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl || null;
    if (data.sku !== undefined) updates.sku = data.sku || null;
    if (data.barcode !== undefined) updates.barcode = data.barcode || null;
    if (data.weight !== undefined) updates.weight = data.weight ? parseFloat(data.weight) : null;
    if (data.stockQuantity !== undefined) updates.stockQuantity = data.stockQuantity ? parseInt(data.stockQuantity) : null;
    if (data.lowStockAlert !== undefined) updates.lowStockAlert = parseInt(data.lowStockAlert) || 5;
    if (data.trackStock !== undefined) updates.trackStock = data.trackStock === true;
    if (data.shippingCost !== undefined) updates.shippingCost = parseFloat(data.shippingCost) || 0;
    if (data.freeShippingOver !== undefined) updates.freeShippingOver = data.freeShippingOver ? parseFloat(data.freeShippingOver) : null;
    if (data.isDigital !== undefined) updates.isDigital = data.isDigital === true;
    if (data.digitalFileUrl !== undefined) updates.digitalFileUrl = data.digitalFileUrl || null;
    if (data.isAffiliate !== undefined) updates.isAffiliate = data.isAffiliate === true;
    if (data.affiliateUrl !== undefined) updates.affiliateUrl = data.affiliateUrl || null;
    if (data.affiliateTag !== undefined) updates.affiliateTag = data.affiliateTag || null;
    if (data.affiliateCommission !== undefined) updates.affiliateCommission = data.affiliateCommission ? parseFloat(data.affiliateCommission) : null;
    if (data.amazonAsin !== undefined) updates.amazonAsin = data.amazonAsin || null;
    if (data.creditsCost !== undefined) updates.creditsCost = parseInt(data.creditsCost) || 0;
    if (data.creditsDiscount !== undefined) updates.creditsDiscount = parseInt(data.creditsDiscount) || 0;
    if (data.featured !== undefined) updates.featured = data.featured === true;
    if (data.isActive !== undefined) updates.isActive = data.isActive !== false;
    if (data.sortOrder !== undefined) updates.sortOrder = parseInt(data.sortOrder) || 0;

    // Recalculate margin if price or cost changed
    if (updates.price !== undefined || updates.costPrice !== undefined) {
      const product = await prisma.marketplaceProduct.findUnique({ where: { id } });
      if (product && !product.isAffiliate) {
        const newPrice = updates.price !== undefined ? updates.price : product.price;
        const newCost = updates.costPrice !== undefined ? updates.costPrice : product.costPrice;
        if (newCost && newPrice > 0) {
          updates.marginPercent = ((newPrice - newCost) / newPrice) * 100;
        }
      }
    }

    // Update slug if name changed
    if (updates.name) {
      updates.slug = updates.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }

    const product = await prisma.marketplaceProduct.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    await prisma.marketplaceProduct.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
