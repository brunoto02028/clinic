import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

// Get a single project with documents, drafts and messages
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.studyProject.findFirst({
    where: { id: params.id, ownerId: userId },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      drafts: { orderBy: { updatedAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

// Update project metadata
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await prisma.studyProject.findFirst({ where: { id: params.id, ownerId: userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  for (const k of ["title", "course", "provider", "level", "description", "status"]) {
    if (typeof body[k] === "string") data[k] = body[k];
  }
  const project = await prisma.studyProject.update({ where: { id: params.id }, data });
  return NextResponse.json({ project });
}

// Delete project (cascades documents, drafts, messages)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owned = await prisma.studyProject.findFirst({ where: { id: params.id, ownerId: userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studyProject.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
