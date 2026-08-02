import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAIClinical } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question, speciality, language } = await req.json();

  if (!question) {
    return NextResponse.json({ error: "Clinical question is required" }, { status: 400 });
  }

  const lang = language === "pt" ? "Portuguese (Brazil)" : "English";
  const focus = speciality || "musculoskeletal physical rehabilitation";

  const prompt = `You are an evidence-based clinical research assistant for a physical rehabilitation clinic. You have deep knowledge of:
- Musculoskeletal physical rehabilitation
- Sports medicine and return-to-sport protocols
- Pain science (including central sensitisation, nociceptive vs neuropathic pain)
- Electrotherapy (laser therapy, shockwave therapy, ultrasound, TENS)
- Manual therapy (dry needling, cupping, mobilisation)
- Exercise therapy and prescription
- Biomechanics and gait analysis
- Post-surgical rehabilitation

CLINICAL QUESTION:
"${question}"

SPECIALITY FOCUS: ${focus}

INSTRUCTIONS:
1. Answer the clinical question with evidence-based information
2. Cite specific studies, systematic reviews, or clinical guidelines where possible
3. Include: author names, journal names, and approximate year of publication
4. Rate the level of evidence (Level I = systematic review/RCT, Level II = cohort, Level III = case-control, Level IV = case series, Level V = expert opinion)
5. Provide practical clinical applications (how to apply this in practice)
6. If there is conflicting evidence, present both sides
7. Include dosage/parameters where applicable (e.g., for shockwave: number of pulses, frequency, energy level)
8. Write in ${lang}

Return a JSON object:
{
  "answer": "Comprehensive evidence-based answer (3-5 paragraphs)",
  "keyFindings": ["Array of 3-5 bullet points summarising the main findings"],
  "references": [
    {"authors": "Smith et al.", "year": 2023, "title": "Study title", "journal": "Journal name", "level": "I"},
    ...
  ],
  "clinicalApplication": "How to apply this in your clinic — specific protocols, dosages, or techniques",
  "evidenceLevel": "Overall quality of evidence (Strong/Moderate/Limited/Conflicting)",
  "relatedQuestions": ["2-3 follow-up questions the clinician might want to explore"]
}

Return ONLY the JSON object, no markdown.`;

  try {
    const rawResponse = await callAIClinical(prompt, {
      temperature: 0.4,
      maxTokens: 6144,
    });

    // Parse JSON from response
    let result;
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch {
        const cleaned = rawResponse.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        const retryMatch = cleaned.match(/\{[\s\S]*\}/);
        if (retryMatch) result = JSON.parse(retryMatch[0]);
      }
    }

    if (!result || !result.answer) {
      return NextResponse.json({ error: "Failed to generate evidence-based response. Please try again." }, { status: 422 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[evidence-search] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
