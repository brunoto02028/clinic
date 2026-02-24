import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST — Generate educational content from voice/text input
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !["SUPERADMIN", "ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const clinicId = user.clinicId;

    const body = await req.json();
    const { transcript, contentType, language } = body;

    if (!transcript || transcript.trim().length < 5) {
      return NextResponse.json({ error: "Please provide a description of the content you want to create." }, { status: 400 });
    }

    // Fetch existing categories for the AI to match against
    const categories = await prisma.educationCategory.findMany({
      where: clinicId ? { clinicId } : {},
      select: { id: true, name: true, description: true },
    });

    const categoryList = categories.length > 0
      ? categories.map(c => `- "${c.name}" (id: ${c.id})${c.description ? ` — ${c.description}` : ""}`).join("\n")
      : "No categories exist yet.";

    // Always generate in English — site i18n handles translations
    const systemPrompt = `You are an AI assistant for a physiotherapy clinic called Bruno Physical Rehabilitation (BPR).
Your job is to generate educational content for patients based on the therapist's spoken or typed instructions.
The therapist may speak in English or Portuguese — understand both, but ALWAYS write the output content in English.

IMPORTANT RULES:
- ALWAYS write in English regardless of the input language
- Content must be professional, evidence-based, and patient-friendly
- Use clear, simple language patients can understand
- Include practical advice and actionable steps
- Never invent medical claims — stick to well-established physiotherapy knowledge
- For exercises: include detailed step-by-step instructions with sets/reps
- For articles: write comprehensive but readable content with sections

Available categories:
${categoryList}

Return a JSON object with ALL of these fields:
{
  "title": "Clear, descriptive title",
  "description": "Brief 1-2 sentence description for listing cards",
  "contentType": "${contentType || "article"}", 
  "body": "Full content body with markdown formatting (headings, bullet points, bold)",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "duration": number (estimated reading/exercise time in minutes),
  "tags": ["tag1", "tag2", ...] (relevant body parts, conditions, techniques),
  "bodyParts": ["body part 1", ...] (specific body regions targeted),
  "categoryId": "matching category ID from the list above, or null if none match",
  "suggestedCategory": "if no category matches, suggest a new category name",
  "equipment": "required equipment (for exercises), or null",
  "instructions": "step-by-step instructions (for exercises), or null",
  "repetitions": "sets and reps info (for exercises), or null",
  "precautions": "safety warnings and contraindications, or null"
}`;

    const userPrompt = `The therapist said: "${transcript}"

Content type requested: ${contentType || "article"}

Generate complete educational content based on this. Fill in ALL fields in the JSON response.`;

    const aiResponse = await callAI(userPrompt, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
      jsonMode: true,
    });

    // Parse the AI response
    let generated: any;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generated = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseErr) {
      console.error("[edu-ai] Failed to parse AI response:", aiResponse.substring(0, 500));
      return NextResponse.json({ error: "AI generated invalid response. Please try again." }, { status: 500 });
    }

    // If AI suggested a new category and we should auto-create it
    let resolvedCategoryId = generated.categoryId || null;
    if (!resolvedCategoryId && generated.suggestedCategory && clinicId) {
      // Check if a similar category already exists
      const existing = await prisma.educationCategory.findFirst({
        where: {
          clinicId,
          name: { contains: generated.suggestedCategory, mode: "insensitive" as any },
        },
      });

      if (existing) {
        resolvedCategoryId = existing.id;
      }
      // Don't auto-create — return the suggestion for the user to confirm
    }

    return NextResponse.json({
      generated: {
        ...generated,
        categoryId: resolvedCategoryId,
      },
      categories,
    });
  } catch (err: any) {
    console.error("[edu-ai] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
