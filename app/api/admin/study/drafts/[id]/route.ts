import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function ownDraft(draftId: string, userId: string) {
  const d = await prisma.studyDraft.findUnique({
    where: { id: draftId },
    include: { project: { select: { ownerId: true } } },
  });
  if (!d || d.project.ownerId !== userId) return null;
  return d;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = await ownDraft(params.id, userId);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.content === "string") { data.content = body.content; data.wordCount = countWords(body.content); }
  if (typeof body.status === "string" && ["writing", "reviewing", "to_deliver", "delivered"].includes(body.status)) data.status = body.status;

  const draft = await prisma.studyDraft.update({ where: { id: params.id }, data });
  return NextResponse.json({ draft });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const d = await ownDraft(params.id, userId);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studyDraft.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
