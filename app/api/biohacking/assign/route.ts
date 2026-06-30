import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

/** POST /api/biohacking/assign — assign a protocol to a patient */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true, role: true } });
    if (!user?.clinicId || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { patientId, protocolId, notes, endDate } = await req.json();
    if (!patientId || !protocolId) return NextResponse.json({ error: "patientId and protocolId required" }, { status: 400 });

    // Deactivate existing active protocols for this patient
    await (prisma as any).patientBiohackingProtocol.updateMany({
      where: { patientId, isActive: true },
      data: { isActive: false },
    });

    const assignment = await (prisma as any).patientBiohackingProtocol.create({
      data: {
        clinicId: user.clinicId,
        patientId,
        protocolId,
        notes: notes || null,
        endDate: endDate ? new Date(endDate) : null,
        assignedById: userId,
      },
      include: { protocol: { include: { items: { orderBy: { order: "asc" } } } } },
    });

    return NextResponse.json({ assignment });
  } catch (err: any) {
    console.error("[biohacking/assign POST]", err);
    return NextResponse.json({ error: "Failed to assign" }, { status: 500 });
  }
}

/** GET /api/biohacking/assign?patientId=xxx — get active assignment for a patient */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId required" }, { status: 400 });

    const assignment = await (prisma as any).patientBiohackingProtocol.findFirst({
      where: { patientId, isActive: true },
      include: { protocol: { include: { items: { orderBy: { order: "asc" } } } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignment });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
