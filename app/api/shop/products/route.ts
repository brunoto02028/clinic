// app/api/shop/products/route.ts — Public, no auth required
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await (prisma as any).marketplaceProduct.findMany({
      where: { isActive: true }, // No clinicId filter — public shop shows all
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        shortDescription: true,
        description: true,
        category: true,
        price: true,
        currency: true,
        imageUrl: true,
        compareAtPrice: true,
        featured: true,
        isAffiliate: true,
        affiliateUrl: true,
        amazonAsin: true,
        isDigital: true,
        shippingCost: true,
        tags: true,
      },
    });
    return NextResponse.json({ products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
