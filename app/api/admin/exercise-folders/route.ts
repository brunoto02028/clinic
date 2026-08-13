import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { resolveClinicId } from "@/lib/exercise-folders";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// GET - The folder tree: categories (no parent) each holding their folders.
//       `?flat=true` keeps the old flat list for the select dropdowns.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Same resolution as POST. Reading with `{}` while writing with the fallback
  // let Global View list another clinic's categories and then fail to create
  // folders under them.
  const clinicId = await resolveClinicId(session);
  if (!clinicId) {
    return NextResponse.json({ tree: [], orphans: [], folders: [], total: 0 });
  }

  const folders = await prisma.exerciseFolder.findMany({
    where: { clinicId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { exercises: { where: { isActive: true } } } },
    },
  });

  if (new URL(req.url).searchParams.get("flat") === "true") {
    return NextResponse.json({ folders });
  }

  const shaped = folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    createdAt: f.createdAt,
    exerciseCount: f._count.exercises,
  }));

  const categories = shaped.filter((f) => !f.parentId);
  const tree = categories.map((cat) => {
    const children = shaped.filter((f) => f.parentId === cat.id);
    return {
      ...cat,
      children,
      folderCount: children.length,
      // A category holds no videos itself, but the card shows the whole subtree.
      totalExerciseCount:
        cat.exerciseCount + children.reduce((sum, c) => sum + c.exerciseCount, 0),
    };
  });

  // Folders whose parent vanished would otherwise disappear from the UI
  // entirely, taking their videos with them.
  const categoryIds = new Set(categories.map((c) => c.id));
  const orphans = shaped.filter((f) => f.parentId && !categoryIds.has(f.parentId));

  return NextResponse.json({ tree, orphans, total: folders.length });
}

// POST - Create a category (no parentId) or a folder inside one.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinicId = await resolveClinicId(session);
  if (!clinicId) {
    return NextResponse.json({ error: "No clinic context" }, { status: 400 });
  }

  const { name, parentId } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const trimmed = name.trim();

  if (parentId) {
    const parent = await prisma.exerciseFolder.findUnique({
      where: { id: parentId },
      select: { id: true, clinicId: true, parentId: true },
    });
    if (!parent || parent.clinicId !== clinicId) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Folders can only be nested one level deep" },
        { status: 400 }
      );
    }
  }

  // Names are unique per parent, not globally — "General" may exist under more
  // than one category without them colliding.
  const existing = await prisma.exerciseFolder.findFirst({
    where: { clinicId, name: trimmed, parentId: parentId || null },
  });
  if (existing) {
    return NextResponse.json({ folder: existing });
  }

  const folder = await prisma.exerciseFolder.create({
    data: { clinicId, name: trimmed, parentId: parentId || null },
  });

  return NextResponse.json({ folder }, { status: 201 });
}
