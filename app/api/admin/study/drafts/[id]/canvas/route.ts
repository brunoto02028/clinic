import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { callAIChat, CLAUDE_SONNET_MODEL } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const DOC_CONTEXT_LIMIT = 120000;
const RECENT_KEEP = 16;

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function buildDocContext(documents: { originalName: string; kind: string; extractedText: string | null }[]): string {
  const withText = documents.filter((d) => d.extractedText && d.extractedText.trim());
  if (withText.length === 0) return "";
  let budget = DOC_CONTEXT_LIMIT;
  const parts: string[] = [];
  for (const d of withText) {
    if (budget <= 0) break;
    const slice = (d.extractedText || "").slice(0, budget);
    budget -= slice.length;
    parts.push(`--- DOCUMENT: ${d.originalName} (${d.kind}) ---\n${slice}`);
  }
  return `===== DOCUMENTS (extracted full text of Bruno's uploaded files) =====\n\n${parts.join("\n\n")}\n\n===== END OF DOCUMENTS =====`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const draft = await prisma.studyDraft.findUnique({
    where: { id: params.id },
    include: {
      project: {
        select: {
          ownerId: true, title: true, course: true, provider: true, level: true,
          documents: { select: { originalName: true, kind: true, extractedText: true } },
        },
      },
    },
  });
  if (!draft || draft.project.ownerId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const message = (body.message || "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const mode = `canvas:${params.id}`;
  const projectId = (await prisma.studyDraft.findUnique({ where: { id: params.id }, select: { projectId: true } }))!.projectId;

  const history = await prisma.studyMessage.findMany({
    where: { projectId, mode }, orderBy: { createdAt: "desc" }, take: RECENT_KEEP,
  });
  history.reverse();

  // Shared project context: the same tutor knows what was discussed in the main Tutor chat.
  const tutorMemory = await prisma.studyMemory.findUnique({
    where: { projectId_mode: { projectId, mode: "tutor" } },
  }).catch(() => null);
  const recentTutor = await prisma.studyMessage.findMany({
    where: { projectId, mode: "tutor" }, orderBy: { createdAt: "desc" }, take: 8,
  });
  recentTutor.reverse();
  const sharedParts: string[] = [];
  if (tutorMemory?.summary?.trim()) sharedParts.push(`Summary of earlier tutoring on this project:\n${tutorMemory.summary.trim()}`);
  if (recentTutor.length > 0) {
    sharedParts.push("Most recent main-chat exchange:\n" + recentTutor.map((m) => `${m.role === "user" ? "Bruno" : "Tutor"}: ${m.content.slice(0, 600)}`).join("\n"));
  }
  const sharedContext = sharedParts.length > 0
    ? `\nSHARED PROJECT CONTEXT (you are the SAME tutor across the whole project — use this so your work here is consistent with everything else):\n${sharedParts.join("\n\n")}\n`
    : "";

  const docContext = buildDocContext(draft.project.documents);
  const p = draft.project;
  const systemPrompt = `You are Bruno's expert academic TUTOR (UK ${p.level || "Level 5"} ${p.course}, ${p.provider}) working in a DOCUMENT CANVAS. You are co-writing/editing ONE document with him. British English, academic, evidence-based with Harvard citations (Author, Year) and a References list, distinction standard. Connect to his real clinical practice at BPR when useful.

${sharedContext}${docContext ? `The text below is the FULL TEXT of files Bruno uploaded. You CAN read them; ground the document in them. NEVER say you cannot read PDFs.\n\n${docContext}\n\n` : ""}CURRENT DOCUMENT TITLE: ${draft.title}
CURRENT DOCUMENT (HTML):
${draft.content}

HOW TO RESPOND — STRICT:
- If Bruno asks you to write/edit/rewrite/expand/fix/add to the document, return the COMPLETE UPDATED document as valid semantic HTML (h2/h3, p, ul/ol/li, strong, em, blockquote; end full work with <h2>References</h2>) inside a JSON block, plus a SHORT plain-text note (1-3 sentences) saying what you changed:
\`\`\`json
{ "title": "Optional new title", "content": "<h2>...</h2><p>...</p>" }
\`\`\`
- The content MUST be the ENTIRE document (not just the changed part), so it can replace the canvas.
- If Bruno only asks a question or wants feedback WITHOUT changing the document, reply conversationally with NO JSON block.
- Keep your chat note short — the full work lives in the document, not the chat.`;

  const chatMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let reply: string;
  try {
    reply = await callAIChat(chatMessages, { systemPrompt, model: CLAUDE_SONNET_MODEL, temperature: 0.6, maxTokens: 8192 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI error" }, { status: 500 });
  }

  let updated: { title?: string; content?: string } | null = null;
  const m = reply.match(/```json\s*([\s\S]*?)```/);
  if (m) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (parsed && parsed.content) updated = { title: parsed.title, content: parsed.content };
    } catch { /* ignore */ }
  }
  const note = reply.replace(/```json\s*[\s\S]*?```/g, "").trim() || (updated ? "Done — I've updated the document." : reply);

  await prisma.studyMessage.create({ data: { projectId, mode, role: "user", content: message } });
  await prisma.studyMessage.create({ data: { projectId, mode, role: "assistant", content: note } });

  let savedDraft = null;
  if (updated?.content) {
    const data: any = { content: updated.content, wordCount: countWords(updated.content) };
    if (updated.title && updated.title.trim()) data.title = updated.title.trim();
    savedDraft = await prisma.studyDraft.update({ where: { id: params.id }, data });
  }

  return NextResponse.json({ reply: note, draft: savedDraft });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const draft = await prisma.studyDraft.findUnique({
    where: { id: params.id }, include: { project: { select: { ownerId: true } } },
  });
  if (!draft || draft.project.ownerId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.studyMessage.findMany({
    where: { projectId: draft.projectId, mode: `canvas:${params.id}` }, orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}
