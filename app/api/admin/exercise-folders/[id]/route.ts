import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH - Rename a folder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const folder = await prisma.exerciseFolder.update({
    where: { id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ folder });
}

// DELETE - Remove a folder.
//   default            → exercises inside are just unassigned (folderId -> null)
//   ?withExercises=true → the exercises inside are deactivated too
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const withExercises = new URL(req.url).searchParams.get("withExercises") === "true";

  let deletedExercises = 0;
  if (withExercises) {
    // Soft delete, matching how single-exercise deletion already behaves —
    // keeps any historic prescription rows intact instead of cascading.
    const res = await prisma.exercise.updateMany({
      where: { folderId: id, isActive: true },
      data: { isActive: false },
    });
    deletedExercises = res.count;
  }

  await prisma.exerciseFolder.delete({ where: { id } });

  return NextResponse.json({ success: true, deletedExercises });
}
