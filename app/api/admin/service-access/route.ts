import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — list service access for a patient (query: ?patientId=xxx)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, serviceType, granted } = body;

    if (!patientId || !serviceType) {
      return NextResponse.json({ error: "patientId and serviceType are required" }, { status: 400 });
    }

    const adminId = (session.user as any).id;

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
