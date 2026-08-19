import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { callAI } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

const CHUNK_TARGET_CHARS = 6000;

// Splits article HTML after each top-level closing block tag, then groups the
// pieces into chunks of roughly CHUNK_TARGET_CHARS so tags are never cut in
// half. A block bigger than the target simply becomes its own chunk.
function splitIntoChunks(html: string): string[] {
  const parts = html.split(/(?<=<\/(?:h[1-6]|p|ul|ol|blockquote|figure|table|pre|div)>)/i);
  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    if (current && current.length + part.length > CHUNK_TARGET_CHARS) {
      chunks.push(current);
      current = "";
    }
    current += part;
  }
  if (current) chunks.push(current);
  return chunks;
}

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
      // One call for the whole article came back silently truncated for
      // anything past ~3 pages (a 20k-char article returned 6k chars, cut
      // mid-word, with a 200 OK). Translate it in block-sized chunks instead,
      // each of which fits one model response comfortably.
      const chunks = splitIntoChunks(content);

      const translatedChunks = await Promise.all(
        chunks.map(async (chunk) => {
          const contentPrompt = `Translate the following HTML content to ${targetName}.
IMPORTANT: Keep ALL HTML tags exactly as they are. Only translate the text content between the tags. Do not add any explanation or markdown. Return ONLY the translated HTML.

${chunk}`;

          const raw = await callAI(contentPrompt, {
            temperature: 0.3,
            // Entities like &nbsp; cost several tokens each, so budget roughly
            // one token per source character rather than the usual ~1:4.
            maxTokens: Math.min(16000, Math.max(2048, chunk.length)),
          });

          // Clean up any markdown code fences the AI might add
          const cleaned = raw
            .replace(/^```html?\n?/i, "")
            .replace(/\n?```$/i, "")
            .trim();

          // A chunk that lands drastically shorter than its source was cut off,
          // not translated concisely — fail loudly instead of saving half an
          // article that looks fine until someone reads to the end.
          if (cleaned.length < chunk.length * 0.6) {
            throw new Error(
              `Translation came back truncated (${cleaned.length} of ${chunk.length} characters in one section). Try again.`
            );
          }
          return cleaned;
        })
      );

      translatedContent = translatedChunks.join("");
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
