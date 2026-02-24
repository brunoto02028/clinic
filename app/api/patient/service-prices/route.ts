import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getEffectiveUser } from '@/lib/get-effective-user';

export const dynamic = "force-dynamic";

// GET — patient can see active service prices
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prices = await (prisma as any).servicePrice.findMany({
      where: { isActive: true },
      orderBy: { serviceType: "asc" },
      select: {
        id: true,
        serviceType: true,
        name: true,
        description: true,
        price: true,
        currency: true,
      },
    });

    return NextResponse.json(prices);
  } catch (error: any) {
    console.error("[patient/service-prices GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
