// app/api/patient/marketplace/affiliate-click/route.ts
// Tracks affiliate link clicks for analytics
import { NextRequest, NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/get-effective-user";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    // Get user (optional — anonymous clicks still tracked)
    let userId: string | null = null;
    try {
      const effectiveUser = await getEffectiveUser();
      userId = effectiveUser?.userId || null;
    } catch {}

    const product = await (prisma as any).marketplaceProduct.findUnique({
      where: { id: productId },
      select: { id: true, affiliateUrl: true, isAffiliate: true, affiliateTag: true },
    });

    if (!product || !product.isAffiliate) {
      return NextResponse.json({ error: "Not an affiliate product" }, { status: 404 });
    }

    // Increment click counter on product
    await (prisma as any).marketplaceProduct.update({
      where: { id: productId },
      data: { affiliateClicks: { increment: 1 } },
    }).catch(() => {}); // graceful — field may not exist yet

    return NextResponse.json({ success: true, affiliateUrl: product.affiliateUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
