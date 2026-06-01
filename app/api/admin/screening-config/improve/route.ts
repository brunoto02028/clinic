import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== "SUPERADMIN" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { text, fieldType, language } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const systemPrompt = `You are a UK healthcare compliance expert specialising in physiotherapy, sports therapy, and physical rehabilitation clinics. 

Your task is to improve the given text for a patient assessment screening form used in a UK-based rehabilitation clinic.

IMPORTANT RULES:
- This is NOT a medical practice — it is a physical rehabilitation clinic (physiotherapy, sports therapy, etc.)
- NEVER use the word "medical" or "médico" — use "health" or "saúde" instead
- Follow UK GDPR regulations for patient data
- Follow CSP (Chartered Society of Physiotherapy) and HCPC (Health and Care Professions Council) guidelines
- Use clear, simple language that patients can understand
- Be inclusive and non-discriminatory
- Questions should be clinically relevant for rehabilitation assessment
- Maintain professional tone while being approachable

Field type: ${fieldType || "question"}
Language: ${language === "pt" ? "Brazilian Portuguese" : "British English"}

Return ONLY the improved text, nothing else. No explanations, no quotes, just the improved text.`;

    const improved = await callAI(
      `Improve this ${fieldType || "question"} for a UK rehabilitation clinic screening form:\n\n"${text}"`,
      { systemPrompt, temperature: 0.3, maxTokens: 300 }
    );

    if (!improved) {
      return NextResponse.json({ error: "No suggestion generated" }, { status: 500 });
    }

    return NextResponse.json({ improved: improved.trim() });
  } catch (error) {
    console.error("Error improving text:", error);
    return NextResponse.json({ error: "Failed to generate improvement" }, { status: 500 });
  }
}
