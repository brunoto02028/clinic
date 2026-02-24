import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

// POST — AI chat for quiz generation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["ADMIN", "SUPERADMIN", "THERAPIST"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { messages, conditionName, conditionDescription, currentForm } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  // Build conversation context
  const systemContext = `You are a medical education quiz assistant for a physiotherapy/rehabilitation clinic called BPR (Bruno Physical Rehabilitation).
Your job is to help the admin create educational quizzes for patients.

CONTEXT:
- Condition: ${conditionName || "General health / rehabilitation"}
- Condition description: ${conditionDescription || "N/A"}
- Current quiz form: ${currentForm ? JSON.stringify(currentForm) : "Empty"}

RULES:
1. Have a natural conversation with the admin about what kind of quiz they want.
2. Ask clarifying questions about topic, difficulty, number of questions, target audience.
3. When the admin asks you to generate or create the quiz, respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing the full quiz data.
4. The JSON format MUST be:
{
  "action": "fill_quiz",
  "titleEn": "...", "titlePt": "...",
  "descriptionEn": "...", "descriptionPt": "...",
  "category": "general|condition_specific|treatment|prevention|lifestyle",
  "difficulty": "beginner|intermediate|advanced",
  "xpReward": 25,
  "iconEmoji": "...",
  "questions": [
    {
      "questionEn": "...", "questionPt": "...",
      "options": [
        { "en": "...", "pt": "...", "isCorrect": true },
        { "en": "...", "pt": "...", "isCorrect": false },
        { "en": "...", "pt": "...", "isCorrect": false },
        { "en": "...", "pt": "...", "isCorrect": false }
      ],
      "explanationEn": "...", "explanationPt": "..."
    }
  ]
}
5. Each question must have exactly 4 options, one correct.
6. All text must be bilingual (English + Portuguese-Brazil).
7. Questions should be educational and help patients understand their condition/treatment.
8. If the admin wants to modify specific questions, you can respond with a partial update.
9. Keep responses conversational and helpful. Be concise.
10. You can also respond with {"action": "update_field", "field": "titleEn", "value": "..."} to update specific fields.`;

  const conversationHistory = messages.map((m: { role: string; content: string }) =>
    `${m.role === "user" ? "Admin" : "Assistant"}: ${m.content}`
  ).join("\n\n");

  const prompt = `${systemContext}\n\nCONVERSATION:\n${conversationHistory}\n\nAssistant:`;

  try {
    const response = await callAI(prompt, { temperature: 0.7, maxTokens: 4096 });
    return NextResponse.json({ reply: response });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI chat failed" }, { status: 500 });
  }
}
