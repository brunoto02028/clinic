// BPR's platform-wide pricing hub: global service prices and packages created on
// the platform Stripe account. A tenant's ADMIN must not touch them — a studio
// charges through its own Connect account (activity 52, T-2).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSuperadminActor } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

// GET — list service access for a patient (query: ?patientId=xxx)
export async function GET(req: NextRequest) {
  try {
    if (!(await getSuperadminActor(req))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patientId = req.nextUrl.searchParams.get("patientId");
    if (!patientId) {
      return NextResponse.json({ error: "patientId is required" }, { status: 400 });
    }

    const access = await (prisma as any).serviceAccess.findMany({
      where: { patientId },
      include: { grantedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(access);
  } catch (error: any) {
    console.error("[service-access GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — grant or revoke free access for a patient
export async function POST(req: NextRequest) {
  try {
    const superadmin = await getSuperadminActor(req);
    if (!superadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { patientId, serviceType, granted } = body;

    if (!patientId || !serviceType) {
      return NextResponse.json({ error: "patientId and serviceType are required" }, { status: 400 });
    }

    const adminId = superadmin.userId;

    // Find existing access record
    const existing = await (prisma as any).serviceAccess.findFirst({
      where: { patientId, serviceType },
    });

    if (existing) {
      // Update existing
      const updated = await (prisma as any).serviceAccess.update({
        where: { id: existing.id },
        data: {
          granted: granted !== false,
          grantedById: granted !== false ? adminId : null,
        },
      });
      return NextResponse.json(updated);
    } else {
      // Create new
      const created = await (prisma as any).serviceAccess.create({
        data: {
          patientId,
          serviceType,
          granted: granted !== false,
          grantedById: granted !== false ? adminId : null,
        },
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    console.error("[service-access POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
