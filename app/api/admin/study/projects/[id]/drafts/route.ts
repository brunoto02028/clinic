import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// List drafts for a project
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await prisma.studyProject.findFirst({ where: { id: params.id, ownerId: userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const drafts = await prisma.studyDraft.findMany({ where: { projectId: params.id }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ drafts });
}

// Create a draft (e.g. from an AI-generated assignment)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const owned = await prisma.studyProject.findFirst({ where: { id: params.id, ownerId: userId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = (body.title || "Untitled draft").trim();
  const content = body.content || "";
  const taskId = typeof body.taskId === "string" && body.taskId ? body.taskId : null;
  const draft = await prisma.studyDraft.create({
    data: { projectId: params.id, title, content, wordCount: countWords(content), taskId },
  });
  await prisma.studyProject.update({ where: { id: params.id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ draft });
}
