import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

// Delete a study document (verifies ownership through its project)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.studyDocument.findUnique({
    where: { id: params.id },
    include: { project: { select: { ownerId: true } } },
  });
  if (!doc || doc.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.studyDocument.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
