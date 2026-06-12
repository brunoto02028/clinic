import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { callAIChat, CLAUDE_SONNET_MODEL } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const DOC_CONTEXT_LIMIT = 160000; // chars of document text injected into the prompt (Claude has a large context window; fit multiple PDFs)
const RECENT_KEEP = 24;          // most recent messages always sent verbatim
const SUMMARY_TRIGGER = 12;      // start summarising once this many messages pile up beyond RECENT_KEEP

// Fold older messages into a rolling summary so the tutor never loses earlier context.
async function summariseOlder(
  previousSummary: string,
  olderMessages: { role: string; content: string }[]
): Promise<string> {
  const transcript = olderMessages
    .map((m) => `${m.role === "user" ? "Bruno" : "Tutor"}: ${m.content}`)
    .join("\n\n")
    .slice(0, 16000);
  const prompt = `You maintain the LONG-TERM MEMORY of an ongoing tutoring conversation. Update the running memory so NOTHING important is forgotten.

${previousSummary ? `EXISTING MEMORY:\n${previousSummary}\n\n` : ""}NEW MESSAGES TO FOLD IN:\n${transcript}

Produce an updated, well-structured memory (bullet points) capturing: key facts about Bruno's course/assignments, decisions made, the structure/plans agreed, drafts produced, feedback given, the student's preferences and writing voice, deadlines, and any open tasks. Be concise but complete. Output ONLY the updated memory.`;
  try {
    return await callAIChat([{ role: "user", content: prompt }], {
      model: CLAUDE_SONNET_MODEL,
      temperature: 0.3,
      maxTokens: 1500,
    });
  } catch {
    // If summarisation fails, keep the previous memory rather than losing it.
    return previousSummary;
  }
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

function memoryBlock(memory: string): string {
  if (!memory || !memory.trim()) return "";
  return `\n\nLONG-TERM MEMORY (everything important agreed/discussed earlier in this project — treat as fully known, never ask Bruno to repeat it):\n${memory.trim()}`;
}

function tutorPrompt(project: { title: string; course: string; provider: string; level: string | null }, docContext: string, memory: string): string {
  return `You are an expert academic TUTOR and subject-matter specialist in sports therapy, physical rehabilitation, anatomy, biomechanics, and exercise science. You are helping Bruno Azenha Tonheta complete his **${project.level || "Level 5"} ${project.course}** with **${project.provider}** (UK). The current study project is: "${project.title}".${memoryBlock(memory)}

WHO BRUNO IS:
- An experienced practising sports/physical rehabilitation therapist (clinic owner at BPR — Bruno Physical Rehabilitation, Ipswich, UK).
- English is his second language (native Portuguese/Brazilian). Keep language clear; he understands clinical English well.

YOUR ROLE:
- Be a warm, encouraging, highly knowledgeable tutor who helps him UNDERSTAND and PRODUCE high-quality coursework — not just hand him answers, but coach him to a distinction-level result.
- Be PREDICTIVE: anticipate the next step, suggest a structure before he asks, flag what an assessor will look for, and proactively offer to draft sections.
- Ask 1-2 sharp clarifying questions ONLY when genuinely needed; otherwise move the work forward.

UPLOADED DOCUMENTS — CRITICAL:
- The text inside the "DOCUMENTS" block below is the FULL TEXT that has already been EXTRACTED from the files (PDFs, Word, images) Bruno uploaded to this project. You CAN read them — they are right here.
- NEVER tell Bruno you "cannot read PDFs", "cannot open attachments", or that you only have your "system instructions". You DO have his documents — read, quote and learn from them.
- If a specific document he expects is missing or its text looks empty/garbled, say exactly which file seems missing and ask him to re-upload THAT file. Do not deny the ability to read files in general.
${docContext ? `- ALWAYS map your help to this uploaded material; quote exact learning outcomes/assessment criteria where present, and make sure every piece of work explicitly satisfies them.\n\n${docContext}` : "- No documents have been uploaded yet. Ask Bruno to upload the assignment brief and marking criteria so you can tailor everything to them, but still help based on standard UK Level 5 sports therapy standards."}

WRITING STANDARDS (UK academic):
- British English spelling. Academic but readable register.
- Evidence-based: reference real research, guidelines (NICE, NHS), and anatomy/physiology. Use Harvard-style in-text citations (Author, Year) and a References list when drafting full work.
- Critical analysis, not just description — Level 5 requires evaluation and application to practice.
- Where useful, connect theory to Bruno's real clinical practice at BPR (electrotherapy, dry needling, biomechanics, exercise therapy) to make it authentic and humanised.

PRODUCING DRAFTS — STRICT (this keeps his workspace organised):
- ANY time you produce written coursework — a full assignment, essay, section, paragraph(s), case study, plan, structured answer, or a rewrite — you MUST output it as an HTML draft wrapped in a JSON block. NEVER paste a long piece of written work as plain chat prose; that clutters the chat. The written work belongs in the draft.
\`\`\`json
{ "title": "Short descriptive title", "content": "<h2>...</h2><p>...</p>..." }
\`\`\`
- content MUST be valid semantic HTML (h2/h3, p, ul/ol/li, strong, em, blockquote). End full assignments with an <h2>References</h2> list.
- Outside the JSON block keep ONLY a SHORT plain-text note (1-4 sentences): what it covers, how it meets the criteria, and what he should personalise. The note must be short — the full text lives in the draft, not the chat.
- If he is just discussing, asking a question, or wants quick feedback (not written work), reply conversationally WITHOUT a JSON block.`;
}

function englishPrompt(project: { title: string; provider: string }, docContext: string, memory: string): string {
  return `You are a friendly, expert ENGLISH LANGUAGE COACH preparing Bruno for the PRACTICAL (spoken) English requirement and written English of his Level 5 course with ${project.provider}. Bruno is a Brazilian sports therapist; English is his second language.${memoryBlock(memory)}

YOUR JOB:
- Improve his spoken and written English for a clinical/academic context.
- When he writes something, gently CORRECT it: show the corrected version, then briefly explain the 2-3 most important fixes in simple terms (you may use a little Portuguese to clarify when he's stuck).
- Teach practical CLINICAL & ACADEMIC vocabulary, phrasing, and pronunciation tips relevant to physiotherapy/sports therapy.
- Run MOCK PRACTICAL EXAM questions: ask him a realistic question an assessor might ask (e.g. explaining an assessment, a treatment rationale, anatomy), let him answer, then give constructive feedback and a model answer.
- Be encouraging and confidence-building. Keep responses focused and not too long.

CONTEXT — UPLOADED DOCUMENTS:
- The text in the "DOCUMENTS" block below is the FULL TEXT already EXTRACTED from the files (PDFs, Word, images) Bruno uploaded. You CAN read them. NEVER say you cannot read PDFs or attachments.
${docContext ? `The material below describes what he'll be examined on — tailor vocabulary and mock questions to it:\n\n${docContext}` : "No exam documents uploaded yet — suggest he uploads the practical exam brief so you can target the exact topics. Meanwhile, use standard sports-therapy clinical scenarios."}

Reply mainly in English. Always be specific and actionable.`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getStudyUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.studyProject.findFirst({
    where: { id: params.id, ownerId: userId },
    include: { documents: { select: { originalName: true, kind: true, extractedText: true } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const message = (body.message || "").trim();
  const mode = body.mode === "english" ? "english" : "tutor";
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  // ── Long-term memory + recent window ──
  // Load (or lazily create) the rolling memory for this project + mode.
  const memoryRow = await prisma.studyMemory.upsert({
    where: { projectId_mode: { projectId: params.id, mode } },
    create: { projectId: params.id, mode, summary: "", summarizedCount: 0 },
    update: {},
  });

  const totalCount = await prisma.studyMessage.count({ where: { projectId: params.id, mode } });
  let summary = memoryRow.summary || "";
  let summarizedCount = memoryRow.summarizedCount || 0;

  // If too many messages have accrued beyond the recent window, fold the
  // oldest un-summarised ones into the rolling memory so nothing is lost.
  const unsummarised = totalCount - summarizedCount;
  if (unsummarised > RECENT_KEEP + SUMMARY_TRIGGER) {
    const toFoldCount = unsummarised - RECENT_KEEP; // keep RECENT_KEEP verbatim
    const older = await prisma.studyMessage.findMany({
      where: { projectId: params.id, mode },
      orderBy: { createdAt: "asc" },
      skip: summarizedCount,
      take: toFoldCount,
    });
    if (older.length > 0) {
      summary = await summariseOlder(summary, older.map((m) => ({ role: m.role, content: m.content })));
      summarizedCount += older.length;
      await prisma.studyMemory.update({
        where: { id: memoryRow.id },
        data: { summary, summarizedCount },
      });
    }
  }

  // Load the most recent messages verbatim (those not folded into the summary).
  const recent = await prisma.studyMessage.findMany({
    where: { projectId: params.id, mode },
    orderBy: { createdAt: "asc" },
    skip: summarizedCount,
  });

  const docContext = buildDocContext(project.documents);
  const systemPrompt = mode === "english"
    ? englishPrompt(project, docContext, summary)
    : tutorPrompt(project, docContext, summary);

  const chatMessages = [
    ...recent.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let reply: string;
  try {
    reply = await callAIChat(chatMessages, {
      systemPrompt,
      model: CLAUDE_SONNET_MODEL,
      temperature: 0.7,
      maxTokens: 8192,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI error" }, { status: 500 });
  }

  // Persist both turns
  await prisma.studyMessage.create({ data: { projectId: params.id, mode, role: "user", content: message } });
  await prisma.studyMessage.create({ data: { projectId: params.id, mode, role: "assistant", content: reply } });
  await prisma.studyProject.update({ where: { id: params.id }, data: { updatedAt: new Date() } });

  // Detect an optional draft JSON block (tutor mode)
  let draft: { title?: string; content?: string } | null = null;
  const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && parsed.content) draft = { title: parsed.title || "Untitled draft", content: parsed.content };
    } catch { /* ignore */ }
  }

  return NextResponse.json({ reply, draft });
}
