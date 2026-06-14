import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

/** GET /api/biohacking/protocols — list all protocols for this clinic */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { clinicId: true, role: true } });
    if (!user?.clinicId) return NextResponse.json({ error: "No clinic" }, { status: 403 });

    const protocols = await (prisma as any).biohackingProtocol.findMany({
      where: { clinicId: user.clinicId, isActive: true },
      include: { items: { orderBy: { order: "asc" } }, _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ protocols });
  } catch (err: any) {
    console.error("[biohacking/protocols GET]", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

/** POST /api/biohacking/protocols — create a new protocol */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true, role: true } });
    if (!user?.clinicId || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, items } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const protocol = await (prisma as any).biohackingProtocol.create({
      data: {
        clinicId: user.clinicId,
        name,
        description: description || null,
        createdById: userId,
        items: items?.length
          ? { create: items.map((it: any, i: number) => ({ ...it, order: i })) }
          : undefined,
      },
      include: { items: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ protocol });
  } catch (err: any) {
    console.error("[biohacking/protocols POST]", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
