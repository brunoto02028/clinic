import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

/** PUT /api/biohacking/protocols/[id] — update protocol + replace items */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true, role: true } });
    if (!user?.clinicId || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, isActive, items } = body;

    // Replace all items
    await (prisma as any).biohackingProtocolItem.deleteMany({ where: { protocolId: params.id } });

    const protocol = await (prisma as any).biohackingProtocol.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        isActive: isActive ?? true,
        items: items?.length
          ? { create: items.map((it: any, i: number) => ({ ...it, order: i })) }
          : undefined,
      },
      include: { items: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ protocol });
  } catch (err: any) {
    console.error("[biohacking/protocols PUT]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

/** DELETE /api/biohacking/protocols/[id] — soft delete */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id }, select: { role: true } });
    if (!["ADMIN", "SUPERADMIN"].includes(user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await (prisma as any).biohackingProtocol.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
