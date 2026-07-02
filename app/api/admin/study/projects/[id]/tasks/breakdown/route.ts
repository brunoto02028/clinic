import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { callAIChat, CLAUDE_SONNET_MODEL } from "@/lib/ai-provider";
import { buildDocContext } from "@/lib/study-docs";
import { createTasksFromItems } from "@/lib/study-tasks";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.studyProject.findFirst({
    where: { id: params.id, ownerId: userId },
    include: { documents: { select: { originalName: true, kind: true, extractedText: true } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const braindump = (body.text || "").trim();
  const { context: docContext } = buildDocContext(project.documents);
  if (!braindump && !docContext) {
    return NextResponse.json({ error: "Add some text describing your activities, or upload your syllabus/brief first." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `You are Bruno's academic planning assistant for his UK ${project.level || "Level 5"} ${project.course} (${project.provider}). Today's date is ${today}.

Bruno will give you a brain-dump of everything he has to do (assignments, studies, exams, readings, deadlines) and/or you have the full text of his uploaded course documents. Break this down into a clear, ordered list of DISCRETE ACTIVITIES so he can work on one at a time without feeling overwhelmed.

Return ONLY a JSON array (no prose, no markdown fences) of task objects in the order he should tackle them:
[
  {
    "title": "Short, specific activity name",
    "brief": "1-3 sentences: what is required and what success looks like (reference the marking criteria if known).",
    "steps": "<ul><li>concrete step</li><li>next step</li></ul>",
    "type": "essay | study | exam | reading | other",
    "priority": "low | medium | high",
    "dueDate": "YYYY-MM-DD or null"
  }
]

RULES:
- Make each activity self-contained and actionable. Split big assignments into sensible chunks only if it clearly helps.
- Infer realistic priority from deadlines and weighting. Set dueDate only if a date is given or strongly implied; otherwise null.
- "steps" must be valid HTML using <ul><li>. Keep 3-6 steps.
- Output STRICT JSON only — an array, nothing else.

${docContext ? `COURSE DOCUMENTS (full extracted text):\n${docContext}\n\n` : ""}`;

  const userMsg = braindump
    ? `Here is everything I need to do:\n\n${braindump}`
    : "Use my uploaded course documents to work out the activities I need to complete.";

  let reply: string;
  try {
    reply = await callAIChat([{ role: "user", content: userMsg }], { systemPrompt, model: CLAUDE_SONNET_MODEL, temperature: 0.4, maxTokens: 8192 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI error" }, { status: 500 });
  }

  // Parse the JSON array (tolerate code fences / surrounding text)
  let items: any[] = [];
  try {
    const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenced ? fenced[1] : reply;
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start !== -1 && end !== -1) items = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return NextResponse.json({ error: "Could not understand the breakdown. Try rephrasing your list." }, { status: 422 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "No activities were found. Add more detail and try again." }, { status: 422 });
  }

  const created = await createTasksFromItems(params.id, items);
  return NextResponse.json({ tasks: created });
}
