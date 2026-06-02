import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { callAIChat } from "@/lib/ai-provider";
import { getConfigValue } from "@/lib/system-config";

export const dynamic = "force-dynamic";

// Helper: Search the web using Gemini with Google Search grounding
async function searchWebWithGemini(query: string, geminiKey: string): Promise<string | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    let result = text || "";
    if (groundingMeta?.groundingChunks?.length > 0) {
      result += "\n\nSources:\n";
      groundingMeta.groundingChunks.slice(0, 5).forEach((chunk: any) => {
        if (chunk.web?.uri) result += `- ${chunk.web.title || chunk.web.uri}: ${chunk.web.uri}\n`;
      });
    }
    return result || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages, enableWebSearch } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array is required" }, { status: 400 });
  }

  // If web search is enabled, search for latest info related to the user's question
  let webContext = "";
  if (enableWebSearch !== false) {
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg) {
      const geminiKey = await getConfigValue("GEMINI_API_KEY");
      if (geminiKey) {
        const searchQuery = `UK physiotherapy ${lastUserMsg.content} courses qualifications 2024 2025`;
        const webResult = await searchWebWithGemini(searchQuery, geminiKey);
        if (webResult) {
          webContext = `\n\nWEB SEARCH RESULTS (live, current data):\n${webResult.slice(0, 3000)}`;
        }
      }
    }
  }

  // Fetch all qualifications for context
  const qualifications = await prisma.qualification.findMany({
    orderBy: { dateAchieved: "desc" },
  });

  const qualList = qualifications.map((q) => {
    const date = q.dateAchieved ? new Date(q.dateAchieved).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Date unknown";
    return `- ${q.title} (${q.provider}, ${date}${q.cpdHours ? `, ${q.cpdHours} CPD hrs` : ""}${q.level ? `, ${q.level}` : ""}${q.accreditation ? `, ${q.accreditation}` : ""})`;
  }).join("\n");

  // Fetch saved course opportunities for additional context
  const savedCourses = await prisma.courseOpportunity.findMany({
    where: { status: { in: ["interested", "applied"] } },
    orderBy: { relevanceScore: "desc" },
    take: 10,
  });

  const courseList = savedCourses.length > 0
    ? savedCourses.map((c) => `- ${c.title} (${c.provider}) — Status: ${c.status}, ${c.cost || "Cost TBC"}`).join("\n")
    : "No courses currently saved as interested/applied.";

  const systemPrompt = `You are an expert career advisor and education consultant specialising in UK healthcare, physiotherapy, rehabilitation, and sports medicine.

YOUR CLIENT — BRUNO AZENHA TONHETA:
- Brazilian-born, UK-based physiotherapist and clinic owner
- Owns "Bruno Physical Rehabilitation" (BPR) with clinics in Richmond (London) and Ipswich (Suffolk)
- Ex-professional footballer (played in Brazil, Germany, Sweden), had 3 major knee surgeries — this fuelled his passion for rehabilitation
- Address: 20 Harlequin Close, Isleworth, TW7 7LA

ACADEMIC BACKGROUND:
- Incomplete Licenciatura e Bacharelado em Ciências Biológica - Modalidade Medica (Physiotherapy and Biological Sciences – Medical Modality)
- Faculdade de Americana, Brazil, 2002
- UK ENIC Statement of Comparability: RQF Level 4 / SCQF Level 7 / CQFW Level 4 (ref: 4002353901, issued 23 May 2025)
- Note: "No direct comparison" to UK qualifications — this means Bruno may need additional UK-specific qualifications for certain registrations

CURRENT QUALIFICATIONS & CPD:
${qualList || "No qualifications recorded yet."}

CURRENT SPECIALISATIONS & EQUIPMENT:
- MLS Laser Therapy (MLS Mphi 75 — £30k investment)
- Shockwave Therapy
- Biomechanical Assessment (AI-powered 3D foot scanning)
- Electrotherapy & Ultrasound
- Dry Needling
- Myofascial Dry Cupping
- Infrared Thermography
- Custom Insoles (3D scanning + AI)
- Sports Injury Rehabilitation
- Chronic Pain Management

COURSES BRUNO IS CONSIDERING:
${courseList}

YOUR ROLE:
1. Help Bruno plan his career progression and identify the best next qualifications
2. Consider UK regulatory requirements (HCPC, CSP, STO, FHT registration)
3. Advise on which qualifications would:
   - Expand his scope of practice (e.g., injection therapy, prescribing rights)
   - Increase revenue potential (new services he can offer)
   - Strengthen his competitive advantage
   - Meet insurance/regulatory requirements
4. Be aware that Bruno's Brazilian degree is RQF Level 4 (not Level 6 like a UK BSc), so some pathways may require additional academic qualifications or bridging courses
5. Consider realistic timelines — Bruno runs a busy clinic
6. Advise on the correct sequence of qualifications (prerequisites, dependencies)
7. Know the UK regulatory landscape: HCPC registration requirements, CSP membership, insurance requirements for different treatments

IMPORTANT CONTEXT:
- Core Elements Training (coreelements.uk.com) — Bruno has completed ALL their courses. Provider is STO + FHT accredited, based in Swindon.
- Bruno is NOT currently HCPC registered (his Brazilian degree doesn't directly qualify). He operates under STO/FHT registration as a Sports Therapist.
- To become HCPC registered as a Physiotherapist in the UK, he would need to either: (a) complete a UK-recognised BSc/MSc Physiotherapy, or (b) apply through the HCPC international route with his Brazilian qualifications + UK experience + additional evidence.
- Some advanced qualifications (like prescribing rights) require HCPC registration first.

COMMUNICATION STYLE:
- Be professional but approachable
- Give specific, actionable advice with clear next steps
- Include realistic costs, timelines, and prerequisites
- Mention specific providers/courses where relevant
- Be honest about limitations (e.g., if HCPC registration is needed first)
- Respond in the same language as Bruno's message (English or Portuguese)
- When you have web search results, reference them and cite sources with URLs
- Learn from Bruno's questions and adapt — remember context from the conversation
${webContext}`;

  try {
    const reply = await callAIChat(messages, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("[qualifications/advisor] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
