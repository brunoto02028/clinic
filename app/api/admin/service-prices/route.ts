// BPR's platform-wide pricing hub: global service prices and packages created on
// the platform Stripe account. A tenant's ADMIN must not touch them — a studio
// charges through its own Connect account (activity 52, T-2).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSuperadminActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// GET — list all service prices
export async function GET(req: NextRequest) {
  try {
    if (!(await getSuperadminActor(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (!(await getSuperadminActor(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (!(await getSuperadminActor(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
