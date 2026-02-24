import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

// POST — AI generate quiz questions for a condition
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const { conditionName, conditionDescription, questionCount = 5, difficulty = "beginner", language = "both" } = body;

  if (!conditionName) {
    return NextResponse.json({ error: "conditionName required" }, { status: 400 });
  }

  const prompt = `You are a physiotherapy and health education expert. Generate an educational quiz about the condition: "${conditionName}".
${conditionDescription ? `Condition description: ${conditionDescription}` : ""}

Requirements:
- Generate exactly ${questionCount} multiple-choice questions
- Difficulty level: ${difficulty}
- Each question must have 4 options with exactly 1 correct answer
- Questions should educate patients about their condition: causes, symptoms, prevention, treatment, rehabilitation, and self-care
- Include an explanation for each correct answer to help patients learn

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "titleEn": "Quiz title in English",
  "titlePt": "Quiz title in Portuguese",
  "descriptionEn": "Short description in English",
  "descriptionPt": "Short description in Portuguese",
  "iconEmoji": "relevant emoji",
  "questions": [
    {
      "questionEn": "Question in English?",
      "questionPt": "Question in Portuguese?",
      "options": [
        { "en": "Option A in English", "pt": "Option A in Portuguese", "isCorrect": false },
        { "en": "Option B in English", "pt": "Option B in Portuguese", "isCorrect": true },
        { "en": "Option C in English", "pt": "Option C in Portuguese", "isCorrect": false },
        { "en": "Option D in English", "pt": "Option D in Portuguese", "isCorrect": false }
      ],
      "explanationEn": "Explanation in English",
      "explanationPt": "Explanation in Portuguese"
    }
  ]
}`;

  try {
    const raw = await callAI(prompt, { temperature: 0.7, maxTokens: 4096 });
    // Extract JSON from possible markdown wrapping
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const generated = JSON.parse(jsonStr);
    return NextResponse.json({ generated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
