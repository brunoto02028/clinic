import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";

export const dynamic = "force-dynamic";

async function ownProject(projectId: string, userId: string) {
  return prisma.studyProject.findFirst({ where: { id: projectId, ownerId: userId }, select: { id: true } });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownProject(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await prisma.studyTask.findMany({
    where: { projectId: params.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { drafts: { select: { id: true, title: true, status: true, wordCount: true, updatedAt: true } } },
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownProject(params.id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const count = await prisma.studyTask.count({ where: { projectId: params.id } });
  const task = await prisma.studyTask.create({
    data: {
      projectId: params.id,
      title,
      brief: typeof body.brief === "string" ? body.brief : null,
      steps: typeof body.steps === "string" ? body.steps : null,
      type: ["essay", "study", "exam", "reading", "other"].includes(body.type) ? body.type : "essay",
      priority: ["low", "medium", "high"].includes(body.priority) ? body.priority : "medium",
      status: ["todo", "in_progress", "to_deliver", "done"].includes(body.status) ? body.status : "todo",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      order: count,
    },
    include: { drafts: { select: { id: true, title: true, status: true, wordCount: true, updatedAt: true } } },
  });
  return NextResponse.json({ task });
}
