import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

/**
 * Translate article fields (title, excerpt, content) between EN and PT using AI.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (!session || !userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, excerpt, content, targetLang } = body;

    if (!targetLang || !["en", "pt"].includes(targetLang)) {
      return NextResponse.json({ error: "targetLang must be 'en' or 'pt'" }, { status: 400 });
    }

    const targetName = targetLang === "pt" ? "Brazilian Portuguese (pt-BR)" : "British English (en-GB)";

    // Translate title and excerpt together
    const metaPrompt = `Translate the following to ${targetName}. Return ONLY a JSON object with "title" and "excerpt" fields. Do not add any explanation.

Title: ${title}
Excerpt: ${excerpt}`;

    const metaRes = await callAI(metaPrompt, { temperature: 0.3 });
    let translatedTitle = title;
    let translatedExcerpt = excerpt;

    try {
      const jsonMatch = metaRes.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        translatedTitle = parsed.title || title;
        translatedExcerpt = parsed.excerpt || excerpt;
      }
    } catch {
      translatedTitle = metaRes.split("\n")[0] || title;
    }

    // Translate content (HTML) - instruct to preserve HTML tags
    let translatedContent = content;
    if (content) {
      const contentPrompt = `Translate the following HTML content to ${targetName}. 
IMPORTANT: Keep ALL HTML tags exactly as they are. Only translate the text content between the tags. Do not add any explanation or markdown. Return ONLY the translated HTML.

${content}`;

      translatedContent = await callAI(contentPrompt, { temperature: 0.3 });
      
      // Clean up any markdown code fences the AI might add
      translatedContent = translatedContent
        .replace(/^```html?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();
    }

    return NextResponse.json({
      title: translatedTitle,
      excerpt: translatedExcerpt,
      content: translatedContent,
      targetLang,
    });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
