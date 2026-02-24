import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

export const maxDuration = 120;

// POST: AI-powered content generation for a service page
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPERADMIN", "ADMIN"].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, context, chatHistory } = body;

    const systemPrompt = `You are a bilingual (English + Portuguese-BR) medical content writer for Bruno Physical Rehabilitation (BPR), a physiotherapy clinic in London, UK.

## YOUR JOB
Generate professional, compelling content for service/treatment pages on the clinic website. You ALWAYS produce content in BOTH English AND Portuguese (Brazilian) simultaneously.

## ABOUT BPR
- Digital-first physiotherapy clinic in London
- Services: kinesiotherapy, electrotherapy, microcurrent therapy (MENS), laser & shockwave, therapeutic ultrasound, EMS, sports injury treatment, chronic pain management, pre/post surgery rehab, biomechanical assessment, foot scanning
- Website: https://bpr.rehab | Currency: GBP

## CONTENT RULES
- Professional, empathetic, patient-focused tone
- Evidence-based language, accessible to patients
- British English spelling (physiotherapy, organisation, colour)
- Portuguese: natural Brazilian Portuguese, not literal translations
- Never make exaggerated claims or guarantees
- Keep paragraphs concise and scannable (3-4 sentences max)
- Benefits should be specific and measurable where possible
- "Who Is It For" should list patient profiles/conditions
- "How It Works" should explain the treatment process step by step

## OUTPUT FORMAT
You MUST respond with a JSON object wrapped in \`\`\`json code block. Include ONLY the fields relevant to the request.

For FULL content generation, use this schema:
\`\`\`json
{
  "titleEn": "Service Name",
  "titlePt": "Nome do Servico",
  "descriptionEn": "1-2 sentence description",
  "descriptionPt": "Descricao em 1-2 frases",
  "benefitsEn": ["Benefit 1", "Benefit 2", ...],
  "benefitsPt": ["Beneficio 1", "Beneficio 2", ...],
  "whoIsItForEn": "Paragraph describing ideal patients...",
  "whoIsItForPt": "Paragrafo descrevendo pacientes ideais...",
  "howItWorksEn": "Paragraph explaining the treatment process...",
  "howItWorksPt": "Paragrafo explicando o processo de tratamento...",
  "sessionInfoEn": "Sessions: 30 min | 2x/week | In-clinic",
  "sessionInfoPt": "Sessoes: 30 min | 2x/semana | Na clinica",
  "faqJson": [
    {"questionEn": "...", "questionPt": "...", "answerEn": "...", "answerPt": "..."}
  ],
  "suggestedIcons": ["Dumbbell", "Activity", "Heart"],
  "imagePrompt": "Professional photo prompt for hero image...",
  "_summary": "Brief summary of what was generated (shown to user)"
}
\`\`\`

For PARTIAL updates (e.g. "write 6 benefits"), include only the relevant fields plus "_summary".
For FAQ generation, include "faqJson" plus "_summary".
For image prompts, include "imagePrompt" plus "_summary".

The "_summary" field is a short human-readable message (in the user's language) describing what was generated. Keep it to 1-2 sentences.

## AVAILABLE ICONS (for suggestedIcons field)
Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart, Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone, Hand, Ear, Eye, Sparkles, Sun, Moon, Wind, Droplets, Thermometer, Timer, Clock, Gauge, TrendingUp, ArrowUpCircle, CheckCircle, Star, Award, Crown, Gem, Lightbulb, Puzzle, Layers, Grid3x3, Move, RotateCcw, RefreshCw, Repeat, Crosshair, Focus, Maximize, Minimize, ZoomIn, Magnet, Battery, BatteryCharging, Wifi, Radio, Vibrate, Volume2, Music, Hammer, Wrench, Settings, Cog, CircleDashed, Orbit, Atom, Microscope, FlaskConical, Leaf, TreePine, Mountain, Sunrise, CloudSun, Umbrella, Snowflake, Flower2, Apple, Banana, Cherry, Grape, Citrus, Salad, Beef, Pill, Siren, Ambulance, Baby, PersonStanding, Footprints, Accessibility, Bike, Dumbbell, Trophy`;

    const contextStr = context
      ? `\n\nCurrent page data:\n${JSON.stringify(context, null, 2)}`
      : "";

    const historyStr = chatHistory && chatHistory.length > 0
      ? `\n\nConversation history:\n${chatHistory.map((m: any) => `${m.role}: ${m.content.slice(0, 300)}`).join("\n")}`
      : "";

    const fullPrompt = `${systemPrompt}${contextStr}${historyStr}\n\nUser request: ${message}`;

    const response = await callAI(fullPrompt, { temperature: 0.7, maxTokens: 8192 });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error("Error generating service content:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
