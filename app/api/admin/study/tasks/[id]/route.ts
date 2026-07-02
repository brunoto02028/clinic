import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

async function ownTask(taskId: string, userId: string) {
  const t = await prisma.studyTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true } } },
  });
  if (!t || t.project.ownerId !== userId) return null;
  return t;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownTask(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.brief === "string") data.brief = body.brief;
  if (typeof body.steps === "string") data.steps = body.steps;
  if (["essay", "study", "exam", "reading", "other"].includes(body.type)) data.type = body.type;
  if (["low", "medium", "high"].includes(body.priority)) data.priority = body.priority;
  if (["todo", "in_progress", "to_deliver", "done"].includes(body.status)) data.status = body.status;
  if (body.dueDate === null) data.dueDate = null;
  else if (typeof body.dueDate === "string") { const d = new Date(body.dueDate); if (!isNaN(d.getTime())) data.dueDate = d; }
  if (typeof body.order === "number") data.order = body.order;

  const task = await prisma.studyTask.update({
    where: { id: params.id }, data,
    include: { drafts: { select: { id: true, title: true, status: true, wordCount: true, updatedAt: true } } },
  });
  return NextResponse.json({ task });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownTask(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studyTask.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
