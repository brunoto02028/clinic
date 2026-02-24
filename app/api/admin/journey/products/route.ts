import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/journey/products — List marketplace products
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;

    const products = await (prisma as any).marketplaceProduct.findMany({
      where: clinicId ? { clinicId } : {},
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/journey/products — Create a product
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clinicId = (session.user as any).clinicId;
    const body = await req.json();

    // Auto-calculate margin
    const price = parseFloat(body.price || "0");
    const costPrice = body.costPrice ? parseFloat(body.costPrice) : null;
    const marginPercent = costPrice && price > 0 ? ((price - costPrice) / price) * 100 : null;

    // Auto-generate slug
    const slug = body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || null;

    const product = await (prisma as any).marketplaceProduct.create({
      data: {
        clinicId,
        name: body.name,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        category: body.category || "digital_program",
        price,
        currency: body.currency || "GBP",
        imageUrl: body.imageUrl || null,
        images: body.images || null,
        // Pricing & Margins
        costPrice,
        marginPercent: marginPercent ? parseFloat(marginPercent.toFixed(2)) : null,
        compareAtPrice: body.compareAtPrice ? parseFloat(body.compareAtPrice) : null,
        vatRate: parseFloat(body.vatRate ?? "20"),
        vatIncluded: body.vatIncluded !== false,
        // Shipping & Stock
        sku: body.sku || null,
        barcode: body.barcode || null,
        weight: body.weight ? parseFloat(body.weight) : null,
        stockQuantity: body.stockQuantity != null ? parseInt(body.stockQuantity) : null,
        lowStockAlert: parseInt(body.lowStockAlert || "5"),
        trackStock: body.trackStock === true,
        shippingCost: parseFloat(body.shippingCost || "0"),
        freeShippingOver: body.freeShippingOver ? parseFloat(body.freeShippingOver) : null,
        isDigital: body.isDigital === true,
        digitalFileUrl: body.digitalFileUrl || null,
        // Amazon Affiliate
        isAffiliate: body.isAffiliate === true,
        affiliateUrl: body.affiliateUrl || null,
        affiliateTag: body.affiliateTag || null,
        affiliateCommission: body.affiliateCommission ? parseFloat(body.affiliateCommission) : null,
        amazonAsin: body.amazonAsin || null,
        // Targeting
        targetArchetypes: body.targetArchetypes || null,
        targetMinLevel: body.targetMinLevel ? parseInt(body.targetMinLevel) : null,
        targetConditions: body.targetConditions || null,
        // Credits
        creditsCost: parseInt(body.creditsCost || "0"),
        creditsDiscount: parseInt(body.creditsDiscount || "0"),
        // SEO & Display
        slug,
        tags: body.tags || null,
        featured: body.featured === true,
        isActive: body.isActive !== false,
        sortOrder: parseInt(body.sortOrder || "0"),
      },
    });

    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/journey/products — Update a product
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
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.images !== undefined) updateData.images = body.images;
    // Pricing
    if (body.costPrice !== undefined) updateData.costPrice = body.costPrice ? parseFloat(body.costPrice) : null;
    if (body.compareAtPrice !== undefined) updateData.compareAtPrice = body.compareAtPrice ? parseFloat(body.compareAtPrice) : null;
    if (body.vatRate !== undefined) updateData.vatRate = parseFloat(body.vatRate);
    if (body.vatIncluded !== undefined) updateData.vatIncluded = body.vatIncluded;
    // Auto-recalc margin
    if (body.price !== undefined || body.costPrice !== undefined) {
      const p = parseFloat(body.price ?? updateData.price ?? 0);
      const c = body.costPrice !== undefined ? (body.costPrice ? parseFloat(body.costPrice) : null) : updateData.costPrice;
      updateData.marginPercent = c && p > 0 ? parseFloat(((p - c) / p * 100).toFixed(2)) : null;
    }
    // Shipping & Stock
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.barcode !== undefined) updateData.barcode = body.barcode;
    if (body.weight !== undefined) updateData.weight = body.weight ? parseFloat(body.weight) : null;
    if (body.stockQuantity !== undefined) updateData.stockQuantity = body.stockQuantity != null ? parseInt(body.stockQuantity) : null;
    if (body.lowStockAlert !== undefined) updateData.lowStockAlert = parseInt(body.lowStockAlert);
    if (body.trackStock !== undefined) updateData.trackStock = body.trackStock;
    if (body.shippingCost !== undefined) updateData.shippingCost = parseFloat(body.shippingCost);
    if (body.freeShippingOver !== undefined) updateData.freeShippingOver = body.freeShippingOver ? parseFloat(body.freeShippingOver) : null;
    if (body.isDigital !== undefined) updateData.isDigital = body.isDigital;
    if (body.digitalFileUrl !== undefined) updateData.digitalFileUrl = body.digitalFileUrl;
    // Affiliate
    if (body.isAffiliate !== undefined) updateData.isAffiliate = body.isAffiliate;
    if (body.affiliateUrl !== undefined) updateData.affiliateUrl = body.affiliateUrl;
    if (body.affiliateTag !== undefined) updateData.affiliateTag = body.affiliateTag;
    if (body.affiliateCommission !== undefined) updateData.affiliateCommission = body.affiliateCommission ? parseFloat(body.affiliateCommission) : null;
    if (body.amazonAsin !== undefined) updateData.amazonAsin = body.amazonAsin;
    // Targeting
    if (body.targetArchetypes !== undefined) updateData.targetArchetypes = body.targetArchetypes;
    if (body.targetMinLevel !== undefined) updateData.targetMinLevel = body.targetMinLevel ? parseInt(body.targetMinLevel) : null;
    if (body.creditsCost !== undefined) updateData.creditsCost = parseInt(body.creditsCost);
    if (body.creditsDiscount !== undefined) updateData.creditsDiscount = parseInt(body.creditsDiscount);
    // Display
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = parseInt(body.sortOrder);

    const product = await (prisma as any).marketplaceProduct.update({ where: { id }, data: updateData });
    return NextResponse.json({ product });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/journey/products — Delete a product
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await (prisma as any).marketplaceProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
