import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI, callAIChat } from "@/lib/ai-provider";
import { buildSystemContext, fetchEntityData } from "@/lib/command-context";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SYSTEM_PROMPT_TEMPLATE = `You are **BPR Command Center** — the intelligent, conversational AI partner for Bruno Physical Rehabilitation.

## YOUR PERSONALITY
- You are a smart, proactive business partner — NOT a rigid command executor.
- You think strategically, give opinions, suggest ideas, and challenge assumptions.
- You are warm, direct, and speak like a trusted colleague — not a robot.
- You match the user's language naturally (English or Portuguese).
- You call the user by their first name.

## HOW YOU WORK — CONVERSATION FIRST

**CRITICAL RULE: NEVER rush to execute actions. Always UNDERSTAND first, then ACT.**

Your workflow for every request:
1. **LISTEN** — Understand what the user actually wants (not just the literal words).
2. **CLARIFY** — If the request is vague or could go multiple directions, ask 1-2 smart questions. Example: "Do you want a quick summary or a full PDF report?" or "Should I focus on last 30 days or all time?"
3. **PROPOSE** — Explain what you plan to do and what the output will look like. Get confirmation for big tasks.
4. **EXECUTE** — Only then produce the action block.

For simple/clear requests (e.g., "how many patients do we have?"), skip steps 2-3 and answer directly from the system data.

## YOUR KNOWLEDGE
You have FULL real-time access to the entire BPR system:
- All patients, appointments, treatments, revenue, articles, marketing, gamification
- The live data is provided below in the "LIVE DATA" section
- You can reference specific numbers, patient names, trends, and KPIs
- NEVER invent data — use only what's in the system context

## ACTIONS — HOW TO TRIGGER THEM
When (and ONLY when) you are ready to generate a deliverable, include an action block:

\`\`\`action
{"type": "action_type", "params": {...}}
\`\`\`

**Available actions:**
- \`full_report\` — Comprehensive clinic report PDF. Params: { title?, period?, language?, sections?: string[] }
- \`generate_pdf\` — Custom PDF. Params: { title, sections: [{heading, content}] }
- \`generate_pptx\` — PowerPoint presentation. Params: { title, slides: [{title, bullets: [], notes?}] }
- \`generate_image\` — AI image generation. Params: { prompt, aspectRatio? }
- \`create_article\` — Blog article (saved as draft). Params: { title, excerpt, content }
- \`export_csv\` — Export data as Excel. Params: { dataType: "patients"|"appointments"|"payments" }
- \`instagram_post\` — Instagram post draft. Params: { topic, caption?, imagePrompt?, language? }
- \`send_email\` — Send email. Params: { to, subject, body }
- \`send_whatsapp\` — Send WhatsApp. Params: { to?, patientName?, message }
- \`marketing_campaign\` — Marketing campaign plan PDF. Params: { goal?, duration?, channels?, budget?, language? }
- \`patient_reengagement\` — Inactive patients + re-engagement strategies Excel. Params: { inactiveDays?, limit?, language? }
- \`seo_content_plan\` — SEO blog strategy Excel. Params: { niche?, count?, language? }
- \`social_calendar\` — Social media calendar Excel. Params: { weeks?, platforms?, language? }
- \`business_valuation\` — Business valuation report PDF. Params: { language?, scenario? }

**Rules for actions:**
- Include the action block AFTER your conversational explanation
- You can include multiple action blocks if the user wants several things
- Always tell the user what you're generating before the action block
- If you're unsure which action to use, describe the options and let the user choose

## WHAT YOU CAN DO BEYOND ACTIONS
- **Analyze data** — Spot trends, compare periods, identify problems
- **Give strategic advice** — Marketing ideas, patient retention, pricing, growth
- **Brainstorm** — Content ideas, campaign concepts, business strategies
- **Explain** — Break down metrics, explain what numbers mean for the business
- **Plan** — Create step-by-step plans for marketing, growth, operations
- **Answer anything** — About the clinic, the platform, the data, the industry

## FORMATTING
- Use markdown: **bold** for emphasis, bullet lists for clarity, headers for sections
- Keep responses focused — don't dump everything at once
- Use the real data numbers naturally in conversation (e.g., "With your 15 active patients and £2,400 MRR...")

## ABOUT BPR
- Bruno Physical Rehabilitation — digital-first physiotherapy clinic in London, UK
- URL: https://bpr.rehab | Currency: GBP (£)
- Hybrid model: clinical services + SaaS health-tech platform
- Tech: Next.js 14, React, TypeScript, PostgreSQL, Prisma, AI (Abacus RouteLLM + Gemini)
- Payments: Stripe live | Comms: WhatsApp Business API, Email SMTP, Instagram Graph API

## CURRENT SYSTEM STATE
{{SYSTEM_CONTEXT}}
`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages, action, language } = body;

    // Handle fetch_data action requests from frontend
    if (action === "fetch_data") {
      const entity = body.entity || "patients_list";
      const data = await fetchEntityData(entity);
      return NextResponse.json({ data });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const clinicId = (session.user as any).clinicId;
    const firstName = (session.user as any).firstName || "Admin";
    const userName = `${firstName} ${(session.user as any).lastName || ""}`.trim();

    // Build system context with real-time data
    const systemContext = await buildSystemContext(clinicId);
    const langInstruction = language === "pt"
      ? "\n\n**LANGUAGE: Respond in Portuguese (pt-BR). All text must be in Portuguese. Keep action JSON keys in English.**"
      : "\n\n**LANGUAGE: Respond in English (en-GB). Use British English.**";

    // Load stored long-term memories
    let memoriesBlock = "";
    try {
      const storedMemories = await prisma.commandMemory.findMany({
        where: { userId },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: 50,
      });
      if (storedMemories.length > 0) {
        const memLines = storedMemories.map((m: any) =>
          `- [${m.category}] ${m.content}`
        ).join("\n");
        memoriesBlock = `\n\n## YOUR MEMORIES (learned from previous conversations)\nYou have remembered these things from past interactions with ${firstName}. Use them to personalize your responses:\n${memLines}\n`;
      }
    } catch {}

    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{{SYSTEM_CONTEXT}}", systemContext)
      + memoriesBlock
      + `\n\nCurrent user: ${userName} (${(session.user as any).role}). Address them as "${firstName}".`
      + langInstruction;

    // Enrich messages: auto-resolve fetch_data actions from previous turns
    const enrichedMessages = [...messages];
    for (const msg of enrichedMessages) {
      if (msg.role === "assistant" && msg.content) {
        const fetchMatch = msg.content.match(/```action\s*\{[^}]*"type"\s*:\s*"fetch_data"[^}]*"entity"\s*:\s*"([^"]+)"[^}]*\}/);
        if (fetchMatch) {
          try {
            const data = await fetchEntityData(fetchMatch[1]);
            enrichedMessages.push({
              role: "user",
              content: `[System: Here is the requested "${fetchMatch[1]}" data]\n\n${data}`,
            });
          } catch {}
        }
      }
    }

    const reply = await callAIChat(enrichedMessages, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 16384,
    });

    // Parse action blocks from the response
    const actions: any[] = [];
    const actionRegex = /```action\s*([\s\S]*?)```/g;
    let match;
    while ((match = actionRegex.exec(reply)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.type) actions.push(parsed);
      } catch {}
    }

    // Auto-execute fetch_data actions and append results to the reply
    let finalReply = reply;
    for (const act of actions) {
      if (act.type === "fetch_data" && act.params?.entity) {
        try {
          const data = await fetchEntityData(act.params.entity);
          finalReply += `\n\n---\n**📊 Data loaded: ${act.params.entity}**\n\`\`\`json\n${data.slice(0, 4000)}${data.length > 4000 ? "\n..." : ""}\n\`\`\``;
        } catch {}
      }
    }

    // Extract memories asynchronously (don't block the response)
    extractMemories(userId, clinicId, messages, reply).catch(() => {});

    return NextResponse.json({
      reply: finalReply,
      actions: actions.filter((a) => a.type !== "fetch_data"),
    });
  } catch (err: any) {
    console.error("[command-chat] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Memory Extraction (runs async, doesn't block response) ───
async function extractMemories(
  userId: string,
  clinicId: string | null,
  messages: { role: string; content: string }[],
  aiReply: string
) {
  try {
    // Only extract from conversations with at least 2 user messages (meaningful exchange)
    const userMessages = messages.filter(m => m.role === "user");
    if (userMessages.length < 2) return;

    // Get the last user message and AI reply for context
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
    const prevUserMsg = userMessages.length > 1 ? userMessages[userMessages.length - 2]?.content : "";

    const extractionPrompt = `Analyze this conversation between a clinic admin and an AI assistant. Extract ONLY important learnings worth remembering for future conversations.

PREVIOUS USER MESSAGE: ${prevUserMsg}
LATEST USER MESSAGE: ${lastUserMsg}
AI REPLY (summary): ${aiReply.slice(0, 500)}

Rules:
- Extract preferences, decisions, instructions, context that should be remembered
- Each memory should be a single, clear sentence
- Category must be one of: "preference", "decision", "context", "instruction"
- Importance: 1-10 (10 = critical business decision, 1 = minor preference)
- If there's NOTHING worth remembering, return an empty array
- Do NOT extract trivial things like greetings or simple questions
- Focus on: business preferences, marketing strategies, tone preferences, specific instructions, key decisions

Respond with ONLY a JSON array (no markdown, no explanation):
[{"content": "...", "category": "...", "importance": 5}]
Or empty: []`;

    const result = await callAI(extractionPrompt, { temperature: 0.3, maxTokens: 500 });

    // Parse the JSON response
    let memories: any[] = [];
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      memories = JSON.parse(cleaned);
    } catch {
      // Try to find JSON array in the response
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        try { memories = JSON.parse(match[0]); } catch { return; }
      } else { return; }
    }

    if (!Array.isArray(memories) || memories.length === 0) return;

    // Save each extracted memory
    for (const mem of memories.slice(0, 3)) {
      if (!mem.content || typeof mem.content !== "string" || mem.content.length < 5) continue;

      // Check for similar existing memory to avoid duplicates
      const existing = await prisma.commandMemory.findFirst({
        where: {
          userId,
          content: { contains: mem.content.slice(0, 40) },
        },
      });

      if (existing) {
        await prisma.commandMemory.update({
          where: { id: existing.id },
          data: {
            content: mem.content,
            importance: Math.max(existing.importance, mem.importance || 5),
            source: lastUserMsg.slice(0, 200),
          },
        });
      } else {
        await prisma.commandMemory.create({
          data: {
            userId,
            clinicId: clinicId || undefined,
            category: mem.category || "general",
            content: mem.content,
            source: lastUserMsg.slice(0, 200),
            importance: Math.min(10, Math.max(1, mem.importance || 5)),
          },
        });
      }
    }

    console.log(`[command-chat] Extracted ${memories.length} memories for user ${userId}`);
  } catch (err) {
    console.error("[command-chat] Memory extraction failed:", err);
  }
}
