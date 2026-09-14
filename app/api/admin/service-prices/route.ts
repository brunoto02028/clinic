import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — list all service prices
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prices = await (prisma as any).servicePrice.findMany({
      orderBy: { serviceType: "asc" },
    });

    return NextResponse.json(prices);
  } catch (error: any) {
    console.error("[service-prices GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — remove a service price by id
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await (prisma as any).servicePrice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — create or update a service price (upsert by serviceType)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { serviceType, name, description, price, currency, isActive } = body;

    if (!serviceType || !name || price === undefined) {
      return NextResponse.json({ error: "serviceType, name, and price are required" }, { status: 400 });
    }

    // Prisma refuses a literal `null` inside a compound-unique `where`
    // (clinicId_serviceType) even though clinicId itself is nullable — these
    // are the platform's default, clinic-less prices, so a manual
    // find-then-create/update replaces the upsert that TypeScript's own
    // generated types already knew was invalid (which is why this was cast
    // to `any` in the first place).
    const existing = await (prisma as any).servicePrice.findFirst({
      where: { clinicId: null, serviceType },
    });

    const data = {
      serviceType,
      name,
      description: description || null,
      price: parseFloat(price),
      currency: currency || "GBP",
      isActive: isActive !== false,
    };

    const result = existing
      ? await (prisma as any).servicePrice.update({ where: { id: existing.id }, data })
      : await (prisma as any).servicePrice.create({ data });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[service-prices POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
