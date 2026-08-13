import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { resolveClinicId } from "@/lib/exercise-folders";
import { deleteR2Url } from "@/lib/r2";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["SUPERADMIN", "ADMIN", "THERAPIST"];

// PATCH - Rename a folder and/or move it to another category.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name } = body;
  // `parentId: null` is a real instruction (move to root), so tell it apart
  // from the key simply being absent.
  const movingParent = Object.prototype.hasOwnProperty.call(body, "parentId");
  const parentId: string | null = body.parentId ?? null;

  if (name !== undefined && (!name || !name.trim())) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const callerClinicId = await resolveClinicId(session);
  const current = await prisma.exerciseFolder.findUnique({
    where: { id },
    select: { id: true, clinicId: true, parentId: true, _count: { select: { children: true } } },
  });
  // Without this check a folder id from another clinic could be renamed or
  // moved by anyone holding a staff session here.
  if (!current || current.clinicId !== callerClinicId) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  if (movingParent && parentId) {
    if (parentId === id) {
      return NextResponse.json({ error: "A folder cannot be its own parent" }, { status: 400 });
    }
    // Moving a category that still holds folders would push those folders to a
    // third level, which nothing downstream renders.
    if (current._count.children > 0) {
      return NextResponse.json(
        { error: "Move or delete the folders inside this category first" },
        { status: 400 }
      );
    }
    const parent = await prisma.exerciseFolder.findUnique({
      where: { id: parentId },
      select: { id: true, clinicId: true, parentId: true },
    });
    if (!parent || parent.clinicId !== current.clinicId) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Folders can only be nested one level deep" },
        { status: 400 }
      );
    }
  }

  const data: { name?: string; parentId?: string | null } = {};
  if (name !== undefined) data.name = name.trim();
  if (movingParent) data.parentId = parentId;

  const folder = await prisma.exerciseFolder.update({ where: { id }, data });

  return NextResponse.json({ folder });
}

// DELETE - Remove a folder or a whole category.
//   default            → contents are kept: exercises are unfiled, child
//                        folders are promoted to categories
//   ?withExercises=true → the exercises in the whole subtree are deactivated
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !STAFF_ROLES.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const withExercises = new URL(req.url).searchParams.get("withExercises") === "true";

  const callerClinicId = await resolveClinicId(session);
  const target = await prisma.exerciseFolder.findUnique({
    where: { id },
    select: { id: true, clinicId: true, children: { select: { id: true } } },
  });
  // Deleting is the most damaging of these operations — the clinic check
  // matters most here.
  if (!target || target.clinicId !== callerClinicId) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const childIds = target.children.map((c) => c.id);
  const subtreeIds = [id, ...childIds];

  let deletedExercises = 0;
  let deletedFolders = 1;

  if (withExercises) {
    // Drop the stored media before the rows go inactive — afterwards there is
    // nothing left pointing at the objects, and they would sit in R2 forever.
    const doomed = await prisma.exercise.findMany({
      where: { folderId: { in: subtreeIds }, isActive: true },
      select: { videoUrl: true, thumbnailUrl: true },
    });
    for (const ex of doomed) {
      for (const url of [ex.videoUrl, ex.thumbnailUrl]) {
        try {
          await deleteR2Url(url);
        } catch (mediaErr: any) {
          console.error("Failed to remove media from R2:", mediaErr.message);
        }
      }
    }

    // Soft delete, matching how single-exercise deletion already behaves —
    // keeps any historic prescription rows intact instead of cascading.
    const res = await prisma.exercise.updateMany({
      where: { folderId: { in: subtreeIds }, isActive: true },
      data: { isActive: false, videoUrl: null, thumbnailUrl: null },
    });
    deletedExercises = res.count;
    // The DB cascade removes the children along with the parent.
    deletedFolders += childIds.length;
  } else {
    // Keep the contents. Only the videos sitting directly in this row lose
    // their home — the child folders survive (promoted to categories), so
    // unfiling their videos too would strand them for no reason.
    await prisma.exercise.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    });
    if (childIds.length > 0) {
      await prisma.exerciseFolder.updateMany({
        where: { id: { in: childIds } },
        data: { parentId: null },
      });
    }
  }

  await prisma.exerciseFolder.delete({ where: { id } });

  return NextResponse.json({ success: true, deletedExercises, deletedFolders });
}
