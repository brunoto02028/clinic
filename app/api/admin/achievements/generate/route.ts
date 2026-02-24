import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

// POST — AI generate achievements for a condition
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const { conditionName, conditionDescription, count = 8 } = body;

  if (!conditionName) {
    return NextResponse.json({ error: "conditionName required" }, { status: 400 });
  }

  const prompt = `You are a physiotherapy gamification expert. Generate ${count} achievements/badges for a patient rehabilitation programme focused on: "${conditionName}".
${conditionDescription ? `Condition description: ${conditionDescription}` : ""}

Requirements:
- Mix of categories: treatment milestones, exercise completion, education/quiz completion, engagement (login streaks), and general health milestones
- Each achievement should motivate patients and track real progress
- Include trigger types that can be automated: "manual", "quiz_complete", "exercise_count", "login_streak", "screening_complete", "bp_reading", "session_count"
- XP rewards should scale: easy=25, medium=50, hard=100, epic=200

Return ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "achievements": [
    {
      "titleEn": "Achievement title in English",
      "titlePt": "Achievement title in Portuguese",
      "descriptionEn": "Description in English",
      "descriptionPt": "Description in Portuguese",
      "category": "treatment|exercise|education|engagement|milestone|general",
      "triggerType": "manual|quiz_complete|exercise_count|login_streak|screening_complete|bp_reading|session_count",
      "triggerValue": 5,
      "xpReward": 50,
      "iconEmoji": "🏆",
      "badgeColor": "#8B5CF6"
    }
  ]
}`;

  try {
    const raw = await callAI(prompt, { temperature: 0.7, maxTokens: 4096 });
    let jsonStr = raw;
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const generated = JSON.parse(jsonStr);
    return NextResponse.json({ generated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI generation failed" }, { status: 500 });
  }
}
