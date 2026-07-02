import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { callAIChat, CLAUDE_SONNET_MODEL } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  todo: "To do", in_progress: "In progress", to_deliver: "Ready to deliver", done: "Done",
};

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.studyProject.findFirst({
    where: { id: params.id, ownerId: userId },
    select: { id: true, title: true, course: true, level: true, provider: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await prisma.studyTask.findMany({
    where: { projectId: params.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  const open = tasks.filter((t) => t.status !== "done");
  if (open.length === 0) {
    return NextResponse.json({ reply: "You have no open activities right now. Add some in the Plan tab and I'll help you prioritise." });
  }

  const today = new Date().toISOString().slice(0, 10);
  const list = open.map((t) => {
    const due = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "no deadline";
    return `- "${t.title}" [${STATUS_LABEL[t.status] || t.status}, ${t.priority} priority, due ${due}]${t.brief ? ` — ${t.brief}` : ""}`;
  }).join("\n");

  const tutorMemory = await prisma.studyMemory.findUnique({
    where: { projectId_mode: { projectId: params.id, mode: "tutor" } },
  }).catch(() => null);

  const systemPrompt = `You are Bruno's academic tutor and study coach for his UK ${project.level || "Level 5"} ${project.course} (${project.provider}). Today is ${today}.

Below are his open activities. Give him a SHORT, motivating, practical recommendation of what to focus on TODAY and the order to tackle things, based on deadlines, priority and momentum. Be concrete (name the 1-2 activities to start with and why), and suggest a realistic first action for each. Keep it under 180 words, friendly and plain English. Do NOT output JSON — just a short message.

${tutorMemory?.summary?.trim() ? `Context from earlier tutoring:\n${tutorMemory.summary.trim()}\n\n` : ""}HIS OPEN ACTIVITIES:\n${list}`;

  let reply: string;
  try {
    reply = await callAIChat([{ role: "user", content: "What should I focus on today?" }], {
      systemPrompt, model: CLAUDE_SONNET_MODEL, temperature: 0.6, maxTokens: 700,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI error" }, { status: 500 });
  }

  return NextResponse.json({ reply: reply.trim() });
}
