import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET — Load all memories for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const memories = await prisma.commandMemory.findMany({
      where: { userId },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({
      memories,
      count: memories.length,
    });
  } catch (err: any) {
    console.error("[command-memory] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — Save new memories (called by AI after extracting learnings)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const clinicId = (session.user as any).clinicId;
    const { memories } = await req.json();

    if (!Array.isArray(memories) || memories.length === 0) {
      return NextResponse.json({ error: "No memories provided" }, { status: 400 });
    }

    const created = [];
    for (const mem of memories) {
      if (!mem.content || typeof mem.content !== "string") continue;

      // Check for duplicate/similar memory before creating
      const existing = await prisma.commandMemory.findFirst({
        where: {
          userId,
          content: { contains: mem.content.slice(0, 50) },
        },
      });

      if (existing) {
        // Update existing memory instead of duplicating
        const updated = await prisma.commandMemory.update({
          where: { id: existing.id },
          data: {
            content: mem.content,
            importance: Math.max(existing.importance, mem.importance || 5),
            source: mem.source || existing.source,
            updatedAt: new Date(),
          },
        });
        created.push(updated);
      } else {
        const newMem = await prisma.commandMemory.create({
          data: {
            userId,
            clinicId: clinicId || undefined,
            category: mem.category || "general",
            content: mem.content,
            source: mem.source || null,
            importance: mem.importance || 5,
          },
        });
        created.push(newMem);
      }
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      memories: created,
    });
  } catch (err: any) {
    console.error("[command-memory] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — Delete a specific memory or all memories
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("id");

    if (memoryId) {
      await prisma.commandMemory.deleteMany({
        where: { id: memoryId, userId },
      });
      return NextResponse.json({ success: true, deleted: 1 });
    } else {
      const result = await prisma.commandMemory.deleteMany({
        where: { userId },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    }
  } catch (err: any) {
    console.error("[command-memory] DELETE error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
