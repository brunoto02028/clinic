import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudyUserId } from "@/lib/study-auth";
import { callAIChat, CLAUDE_SONNET_MODEL } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const DOC_CONTEXT_LIMIT = 14000; // chars of document text injected into the prompt

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
  return parts.join("\n\n");
}

function tutorPrompt(project: { title: string; course: string; provider: string; level: string | null }, docContext: string): string {
  return `You are an expert academic TUTOR and subject-matter specialist in sports therapy, physical rehabilitation, anatomy, biomechanics, and exercise science. You are helping Bruno Azenha Tonheta complete his **${project.level || "Level 5"} ${project.course}** with **${project.provider}** (UK). The current study project is: "${project.title}".

WHO BRUNO IS:
- An experienced practising sports/physical rehabilitation therapist (clinic owner at BPR — Bruno Physical Rehabilitation, Ipswich, UK).
- English is his second language (native Portuguese/Brazilian). Keep language clear; he understands clinical English well.

YOUR ROLE:
- Be a warm, encouraging, highly knowledgeable tutor who helps him UNDERSTAND and PRODUCE high-quality coursework — not just hand him answers, but coach him to a distinction-level result.
- Be PREDICTIVE: anticipate the next step, suggest a structure before he asks, flag what an assessor will look for, and proactively offer to draft sections.
- Ask 1-2 sharp clarifying questions ONLY when genuinely needed; otherwise move the work forward.

GROUNDING IN THE ASSESSMENT:
${docContext ? `- The student has uploaded the following assessment material. ALWAYS map your help to these briefs/criteria, quote the exact learning outcomes/assessment criteria, and make sure every piece of work explicitly satisfies them.\n\n${docContext}` : "- No assessment documents have been uploaded yet. Ask Bruno to upload the assignment brief and marking criteria so you can tailor everything to them, but still help based on standard UK Level 5 sports therapy standards."}

WRITING STANDARDS (UK academic):
- British English spelling. Academic but readable register.
- Evidence-based: reference real research, guidelines (NICE, NHS), and anatomy/physiology. Use Harvard-style in-text citations (Author, Year) and a References list when drafting full work.
- Critical analysis, not just description — Level 5 requires evaluation and application to practice.
- Where useful, connect theory to Bruno's real clinical practice at BPR (electrotherapy, dry needling, biomechanics, exercise therapy) to make it authentic and humanised.

PRODUCING DRAFTS — IMPORTANT:
- When Bruno asks you to WRITE / DRAFT / PRODUCE an assignment, essay, section, case study, plan, or answer, output the work as an HTML draft wrapped in a JSON block:
\`\`\`json
{ "title": "Short descriptive title", "content": "<h2>...</h2><p>...</p>..." }
\`\`\`
- content MUST be valid semantic HTML (h2/h3, p, ul/ol/li, strong, em, blockquote). End full assignments with an <h2>References</h2> list.
- If he is just discussing, asking questions, or wants feedback, reply conversationally WITHOUT a JSON block.
- After a JSON draft, add a short plain-text note explaining how it meets the criteria and what he should personalise.`;
}

function englishPrompt(project: { title: string; provider: string }, docContext: string): string {
  return `You are a friendly, expert ENGLISH LANGUAGE COACH preparing Bruno for the PRACTICAL (spoken) English requirement and written English of his Level 5 course with ${project.provider}. Bruno is a Brazilian sports therapist; English is his second language.

YOUR JOB:
- Improve his spoken and written English for a clinical/academic context.
- When he writes something, gently CORRECT it: show the corrected version, then briefly explain the 2-3 most important fixes in simple terms (you may use a little Portuguese to clarify when he's stuck).
- Teach practical CLINICAL & ACADEMIC vocabulary, phrasing, and pronunciation tips relevant to physiotherapy/sports therapy.
- Run MOCK PRACTICAL EXAM questions: ask him a realistic question an assessor might ask (e.g. explaining an assessment, a treatment rationale, anatomy), let him answer, then give constructive feedback and a model answer.
- Be encouraging and confidence-building. Keep responses focused and not too long.

CONTEXT:
${docContext ? `The assessment material below describes what he'll be examined on — tailor vocabulary and mock questions to it:\n\n${docContext}` : "No exam documents uploaded yet — suggest he uploads the practical exam brief so you can target the exact topics. Meanwhile, use standard sports-therapy clinical scenarios."}

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

  // Load recent history for this mode (last 20 messages)
  const history = await prisma.studyMessage.findMany({
    where: { projectId: params.id, mode },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const docContext = buildDocContext(project.documents);
  const systemPrompt = mode === "english"
    ? englishPrompt(project, docContext)
    : tutorPrompt(project, docContext);

  const chatMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
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
